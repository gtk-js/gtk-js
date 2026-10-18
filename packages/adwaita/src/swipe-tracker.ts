/**
 * A port of AdwSwipeTracker, for AdwNavigationView and AdwCarousel (and
 * AdwOverlaySplitView): SwipeTracker is its progress math, and
 * SwipeController turns a widget's touchscreen drags and touchpad scrolling
 * into swipes with it.
 *
 * Progress is in units of the swipeable's distance, with snap points such as
 * -1 (back), 0 and 1 (forward). Touch drags start after 16 px and follow the
 * finger. Touchpad scrolling is wheel events with pixel deltas; browsers have
 * no "scroll stop" event, so a pause ends the swipe. Both end on the snap point
 * the swipe's position and velocity project to, as upstream.
 *
 * @see upstream/libadwaita/src/adw-swipe-tracker.c
 */

/** How far (px) a touchpad scrolls to swipe one snap point, horizontally and vertically. */
export const TOUCHPAD_BASE_DISTANCE_H = 400;
export const TOUCHPAD_BASE_DISTANCE_V = 300;
const EVENT_HISTORY_THRESHOLD_MS = 150;
const VELOCITY_THRESHOLD_TOUCH = 0.3;
const VELOCITY_THRESHOLD_TOUCHPAD = 0.6;
const DECELERATION_TOUCH = 0.998;
const DECELERATION_TOUCHPAD = 0.997;
const VELOCITY_CURVE_THRESHOLD = 2;
const DECELERATION_PARABOLA_MULTIPLIER = 0.35;
/** How far (px) a drag goes before it becomes a swipe. */
export const DRAG_THRESHOLD_DISTANCE = 16;
const EPSILON = 0.005;
const OVERSHOOT_DISTANCE_MULTIPLIER = 0.1;
/** WheelEvent.DOM_DELTA_PIXEL */
const DOM_DELTA_PIXEL = 0;
/** Stands in for GDK's scroll stop event, which browsers don't have. */
const SCROLL_END_TIMEOUT_MS = 150;

export type SwipeDirection = "back" | "forward";

/** AdwSwipeable plus the tracker's signals. */
export interface Swipeable {
  /** Pixels per unit of progress (adw_swipeable_get_distance()). */
  getDistance(): number;
  /** Ascending snap points (adw_swipeable_get_snap_points()). */
  getSnapPoints(): number[];
  getProgress(): number;
  getCancelProgress(): number;
  /** Whether swipes go the other way (RTL), read when one starts. */
  isReversed?(): boolean;
  /** AdwSwipeTracker::prepare */
  prepare?(direction: SwipeDirection): void;
  /** AdwSwipeTracker::begin-swipe */
  beginSwipe?(): void;
  /** AdwSwipeTracker::update-swipe */
  updateSwipe?(progress: number): void;
  /** AdwSwipeTracker::end-swipe: `velocity` in pixels per ms, `to` the snap point to go to. */
  endSwipe?(velocity: number, to: number): void;
}

const State = { None: 0, Pending: 1, Scrolling: 2, Rejected: 3 } as const;
type State = (typeof State)[keyof typeof State];

/** Touches a controller has claimed, so enclosing ones let go of them. */
const claimed = new Map<number, SwipeController>();

const approx = (a: number, b: number) => Math.abs(a - b) < Number.EPSILON;

/** The snap point at `index`; the snap point list is never empty. */
const at = (points: number[], index: number) => points[index] ?? 0;

function findClosestPoint(points: number[], pos: number): number {
  let min = 0;
  for (let i = 1; i < points.length; i++)
    if (Math.abs(at(points, i) - pos) < Math.abs(at(points, min) - pos)) min = i;
  return min;
}

function findNextPoint(points: number[], pos: number): number {
  return points.findIndex((p) => approx(p, pos) || p > pos);
}

function findPreviousPoint(points: number[], pos: number): number {
  return points.findLastIndex((p) => approx(p, pos) || p < pos);
}

/** get_bounds(): a swipe from `pos` reaches the snap points next to it. */
export function getBounds(points: number[], pos: number): [number, number] {
  const closest = findClosestPoint(points, pos);
  let prev = closest;
  let next = closest;
  if (Math.abs(at(points, closest) - pos) >= EPSILON) {
    prev = findPreviousPoint(points, pos);
    next = findNextPoint(points, pos);
  }
  return [at(points, Math.max(prev - 1, 0)), at(points, Math.min(next + 1, points.length - 1))];
}

/**
 * The progress math of AdwSwipeTracker: a swipe moves between the snap
 * points, no further than the ones next to where it started unless long
 * swipes are allowed, and ends on the snap point its velocity points to.
 * Past the first or last snap point it stops, or resists when overshooting
 * is allowed.
 */
export class SwipeTracker {
  /** The swipeable's snap points, ascending (adw_swipeable_get_snap_points()). */
  points: number[] = [0];
  allowLongSwipes = false;
  lowerOvershoot = false;
  upperOvershoot = false;
  /** Pixels per unit of progress, for the overshoot's resistance. */
  distance = 1;
  initialProgress = 0;
  progress = 0;
  private history: { delta: number; time: number }[] = [];

  /** gesture_prepare(): a swipe starts from `progress`. */
  prepare(progress: number): void {
    this.initialProgress = progress;
    this.progress = progress;
  }

  /** append_to_history(): the pointer moved `delta` px at `time` (ms). */
  record(delta: number, time: number): void {
    this.trim(time);
    this.history.push({ delta, time });
  }

  /** gesture_update(): moves by `delta` snap points and returns the progress. */
  update(delta: number): number {
    const [lower, upper] = this.bounds();
    let progress = this.progress + delta;
    this.progress = progress;
    if (progress < lower) {
      if (this.lowerOvershoot) progress = lower - this.adjustForOvershoot(lower - progress);
      else progress = this.progress = lower;
    }
    if (progress > upper) {
      if (this.upperOvershoot) progress = upper + this.adjustForOvershoot(progress - upper);
      else progress = this.progress = upper;
    }
    return progress;
  }

  /**
   * gesture_end(): the velocity (px/ms) the swipe ends with and the snap point
   * it goes to. A cancelled swipe goes to `cancelProgress`, or else back to
   * the closest snap point, like adw_carousel_get_cancel_progress().
   */
  end(
    time: number,
    isTouchpad: boolean,
    cancelled = false,
    cancelProgress?: number,
  ): { velocity: number; to: number } {
    this.trim(time);
    const velocity = this.velocity();
    const to = cancelled
      ? (cancelProgress ?? at(this.points, findClosestPoint(this.points, this.progress)))
      : this.endProgress(velocity, isTouchpad);
    this.reset();
    return { velocity, to };
  }

  /** reset() */
  reset(): void {
    this.initialProgress = 0;
    this.progress = 0;
    this.history = [];
  }

  private trim(time: number): void {
    const first = this.history.findIndex((r) => r.time >= time - EVENT_HISTORY_THRESHOLD_MS);
    this.history.splice(0, first < 0 ? this.history.length : first);
  }

  private bounds(): [number, number] {
    if (this.allowLongSwipes) return [at(this.points, 0), at(this.points, this.points.length - 1)];
    return getBounds(this.points, this.initialProgress);
  }

  private adjustForOvershoot(amount: number) {
    const d = this.distance * OVERSHOOT_DISTANCE_MULTIPLIER;
    return (1 - 1 / (1 + amount * d)) / d;
  }

  /** calculate_velocity() */
  private velocity(): number {
    const [first, ...rest] = this.history;
    const last = rest[rest.length - 1];
    if (!first || !last || first.time === last.time) return 0;
    let total = 0;
    for (const record of rest) total += record.delta;
    let velocity = total / (last.time - first.time);
    const [lower, upper] = this.bounds();
    if (this.progress <= lower && velocity < 0) velocity = 0;
    if (this.progress >= upper && velocity > 0) velocity = 0;
    return velocity;
  }

  /** get_end_progress() */
  private endProgress(velocity: number, isTouchpad: boolean): number {
    const points = this.points;
    const [lower, upper] = this.bounds();
    const clamp = (pos: number) => Math.min(Math.max(pos, lower), upper);
    const speed = Math.abs(velocity);

    if (speed < (isTouchpad ? VELOCITY_THRESHOLD_TOUCHPAD : VELOCITY_THRESHOLD_TOUCH))
      return clamp(at(points, findClosestPoint(points, this.progress)));

    // Project where the swipe would decelerate to.
    const decel = isTouchpad ? DECELERATION_TOUCHPAD : DECELERATION_TOUCH;
    const slope = decel / (1 - decel) / 1000;
    let pos: number;
    if (speed > VELOCITY_CURVE_THRESHOLD) {
      const c = slope / 2 / DECELERATION_PARABOLA_MULTIPLIER;
      const x = speed - VELOCITY_CURVE_THRESHOLD + c;
      pos =
        DECELERATION_PARABOLA_MULTIPLIER * x * x -
        DECELERATION_PARABOLA_MULTIPLIER * c * c +
        slope * VELOCITY_CURVE_THRESHOLD;
    } else {
      pos = speed * slope;
    }
    pos = clamp(pos * Math.sign(velocity) + this.progress);

    // find_point_for_projection(): a fling always leaves the snap point it started from.
    const initial = findClosestPoint(points, this.initialProgress);
    const prev = findPreviousPoint(points, pos);
    const next = findNextPoint(points, pos);
    if ((velocity > 0 ? prev : next) === initial) return at(points, velocity > 0 ? next : prev);
    return at(points, findClosestPoint(points, pos));
  }
}

/**
 * AdwSwipeTracker's input handling for a widget: touchscreen drags (and
 * mouse drags when allowed) and touchpad scrolling, reported to the
 * swipeable through its prepare / begin / update / end callbacks.
 */
export class SwipeController {
  orientation: "horizontal" | "vertical" = "horizontal";
  /** Swaps the directions, for RTL (adw_swipe_tracker_set_reversed()). */
  reversed = false;
  allowMouseDrag = false;
  /** The progress math; its overshoot and long-swipe flags apply. */
  readonly tracker = new SwipeTracker();

  private readonly widget: HTMLElement;
  private readonly swipeable: Swipeable;
  private state: State = State.None;
  private cancelled = false;
  private prevOffset = 0;
  private pointer: { id: number; x: number; y: number } | null = null;
  private scrollEnd: { timer: ReturnType<typeof setTimeout>; time: number } | null = null;

  constructor(widget: HTMLElement, swipeable: Swipeable) {
    this.widget = widget;
    this.swipeable = swipeable;
  }

  get upperOvershoot() {
    return this.tracker.upperOvershoot;
  }

  set upperOvershoot(value: boolean) {
    this.tracker.upperOvershoot = value;
  }

  /** Starts listening to the widget's input; returns the cleanup. */
  attach(): () => void {
    const w = this.widget;
    w.addEventListener("pointerdown", this.onPointerDown);
    w.addEventListener("pointermove", this.onPointerMove);
    w.addEventListener("pointerup", this.onPointerUp);
    w.addEventListener("pointercancel", this.onPointerCancel);
    w.addEventListener("wheel", this.onWheel, { passive: false });
    return () => {
      w.removeEventListener("pointerdown", this.onPointerDown);
      w.removeEventListener("pointermove", this.onPointerMove);
      w.removeEventListener("pointerup", this.onPointerUp);
      w.removeEventListener("pointercancel", this.onPointerCancel);
      w.removeEventListener("wheel", this.onWheel);
      if (this.scrollEnd) clearTimeout(this.scrollEnd.timer);
      this.releasePointer();
      this.reset();
    };
  }

  private get progress() {
    return this.tracker.progress;
  }

  /** The swipeable's current snap points and distance. */
  private sync(): number[] {
    const points = this.swipeable.getSnapPoints();
    this.tracker.points = points;
    this.tracker.distance = this.swipeable.getDistance();
    return points;
  }

  private reset() {
    this.state = State.None;
    this.prevOffset = 0;
    this.cancelled = false;
    this.tracker.reset();
  }

  private gesturePrepare(direction: SwipeDirection) {
    if (this.state !== State.None) return;
    this.swipeable.prepare?.(direction);
    this.tracker.prepare(this.swipeable.getProgress());
    this.state = State.Pending;
  }

  private gestureBegin() {
    if (this.state !== State.Pending) return;
    this.state = State.Scrolling;
    this.swipeable.beginSwipe?.();
  }

  private gestureUpdate(delta: number) {
    if (this.state !== State.Scrolling) return;
    this.sync();
    this.swipeable.updateSwipe?.(this.tracker.update(delta));
  }

  private gestureEnd(time: number, isTouchpad: boolean) {
    if (this.state === State.None) return;
    this.sync();
    const cancelProgress = this.swipeable.getCancelProgress();
    const { velocity, to } = this.tracker.end(time, isTouchpad, this.cancelled, cancelProgress);
    this.swipeable.endSwipe?.(velocity, to);
    this.reset();
  }

  private gestureCancel(time: number, isTouchpad: boolean) {
    if (this.state !== State.Pending && this.state !== State.Scrolling) {
      this.reset();
      return;
    }
    this.cancelled = true;
    this.gestureEnd(time, isTouchpad);
  }

  // --- touch drags (drag_begin_cb() … drag_end_cb()) -----------------------

  private onPointerDown = (e: PointerEvent) => {
    // allow-mouse-drag is FALSE by default: touchscreens only (touch-only).
    if (e.pointerType !== "touch" && !(this.allowMouseDrag && e.button === 0)) return;
    if (this.state !== State.None || this.pointer) return;
    // should_suppress_drag(): not from a window handle (a header bar) inside the widget.
    const handle = e.target instanceof Element ? e.target.closest(".gtk-windowhandle") : null;
    if (handle && this.widget.contains(handle)) return;
    this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    this.prevOffset = 0;
    this.reversed = this.swipeable.isReversed?.() ?? this.reversed;
  };

  private releasePointer() {
    const pointer = this.pointer;
    if (!pointer) return;
    this.pointer = null;
    if (claimed.get(pointer.id) === this) {
      claimed.delete(pointer.id);
      if (this.widget.hasPointerCapture(pointer.id)) this.widget.releasePointerCapture(pointer.id);
    }
  }

  /** Lets go of the touch (GTK_EVENT_SEQUENCE_DENIED). */
  private deny(time: number) {
    this.releasePointer();
    this.gestureCancel(time, false);
  }

  private onPointerMove = (e: PointerEvent) => {
    const pointer = this.pointer;
    if (!pointer || e.pointerId !== pointer.id) return;
    const owner = claimed.get(e.pointerId);
    if (owner && owner !== this) {
      // A nested swipeable claimed it first.
      this.deny(e.timeStamp);
      return;
    }

    const vertical = this.orientation === "vertical";
    const offsetX = e.clientX - pointer.x;
    const offsetY = e.clientY - pointer.y;
    let offset = vertical ? offsetY : offsetX;
    if (!this.reversed) offset = -offset;
    const delta = offset - this.prevOffset;
    this.prevOffset = offset;
    const offsetVertical = Math.abs(offsetY) > Math.abs(offsetX);
    const time = e.timeStamp;

    this.tracker.record(delta, time);

    if (this.state === State.None) {
      if (vertical !== offsetVertical) {
        this.deny(time);
        return;
      }
      this.gesturePrepare(offset > 0 ? "forward" : "back");
    }

    if (this.state === State.Pending) {
      const distance = Math.hypot(offsetX, offsetY);
      if (distance >= DRAG_THRESHOLD_DISTANCE) {
        const points = this.sync();
        const first = at(points, 0);
        const last = at(points, points.length - 1);
        const overshootingLower =
          offset < 0 && (approx(this.progress, first) || this.progress < first);
        const overshootingUpper =
          offset > 0 && (approx(this.progress, last) || this.progress > last);
        if (
          vertical !== offsetVertical ||
          approx(first, last) ||
          (!this.tracker.lowerOvershoot && overshootingLower) ||
          (!this.tracker.upperOvershoot && overshootingUpper)
        ) {
          this.deny(time);
          return;
        }
        this.gestureBegin();
        this.prevOffset = offset;
        // GTK_EVENT_SEQUENCE_CLAIMED: the touch is the swipe's, not the
        // widgets under it (no click when it ends).
        claimed.set(pointer.id, this);
        this.widget.setPointerCapture(pointer.id);
      }
    }

    if (this.state === State.Scrolling) this.gestureUpdate(delta / this.swipeable.getDistance());
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointer || e.pointerId !== this.pointer.id) return;
    this.releasePointer();
    if (this.state !== State.Scrolling) this.gestureCancel(e.timeStamp, false);
    else this.gestureEnd(e.timeStamp, false);
  };

  private onPointerCancel = (e: PointerEvent) => {
    if (!this.pointer || e.pointerId !== this.pointer.id) return;
    this.deny(e.timeStamp);
  };

  // --- touchpad scrolling (handle_scroll_event()) ---------------------------

  private onWheel = (e: WheelEvent) => {
    // Smooth touchpad scrolling only: not line or page deltas, Shift+wheel
    // (a mouse's horizontal scrolling) or Ctrl+wheel (pinch zoom).
    if (e.deltaMode !== DOM_DELTA_PIXEL || e.ctrlKey || e.shiftKey) return;
    if (this.pointer) return;
    if (this.state === State.None) this.reversed = this.swipeable.isReversed?.() ?? this.reversed;
    const vertical = this.orientation === "vertical";
    const distance = vertical ? TOUCHPAD_BASE_DISTANCE_V : TOUCHPAD_BASE_DISTANCE_H;
    let delta = vertical ? e.deltaY : e.deltaX;
    if (this.reversed) delta = -delta;
    const time = e.timeStamp;

    if (this.scrollEnd) clearTimeout(this.scrollEnd.timer);
    this.scrollEnd = { timer: setTimeout(this.onScrollEnd, SCROLL_END_TIMEOUT_MS), time };

    if (this.state === State.Rejected) return;

    if (this.state === State.None) {
      // Scrolling across the swipe, or in something under the pointer that
      // scrolls along it, is theirs: in GTK it never reaches the tracker.
      const across = vertical ? e.deltaX : e.deltaY;
      if (Math.abs(across) >= Math.abs(delta) || this.scrollsAlong(e.target)) {
        this.state = State.Rejected;
        return;
      }
      this.gesturePrepare(delta > 0 ? "forward" : "back");
    }

    if (this.state === State.Pending) {
      const points = this.sync();
      const first = at(points, 0);
      const last = at(points, points.length - 1);
      this.tracker.record(delta, time);
      const overshootingLower =
        delta < 0 && (approx(this.progress, first) || this.progress < first);
      const overshootingUpper = delta > 0 && (approx(this.progress, last) || this.progress > last);
      if (
        approx(first, last) ||
        (!this.tracker.lowerOvershoot && overshootingLower) ||
        (!this.tracker.upperOvershoot && overshootingUpper)
      ) {
        this.gestureCancel(time, true);
        // Until the scrolling stops, like a sequence GTK denied.
        this.state = State.Rejected;
        return;
      }
      this.gestureBegin();
    }

    if (this.state === State.Scrolling) {
      this.tracker.record(delta, time);
      this.gestureUpdate(delta / distance);
      // GDK_EVENT_STOP: no page scrolling or browser back gesture, and no
      // enclosing swipeable.
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private onScrollEnd = () => {
    const end = this.scrollEnd;
    this.scrollEnd = null;
    if (!end) return;
    // The stop event comes right after the last scroll event in GTK, so the
    // velocity is that of the last 150 ms of scrolling.
    if (this.state === State.Scrolling) this.gestureEnd(end.time, true);
    else this.reset();
  };

  /** Whether an element between `target` and the widget scrolls along the swipe. */
  private scrollsAlong(target: EventTarget | null): boolean {
    const vertical = this.orientation === "vertical";
    for (
      let el = target instanceof Element ? target : null;
      el && el !== this.widget;
      el = el.parentElement
    ) {
      const overflow = getComputedStyle(el)[vertical ? "overflowY" : "overflowX"];
      const scrollable = vertical
        ? el.scrollHeight > el.clientHeight
        : el.scrollWidth > el.clientWidth;
      if (scrollable && (overflow === "auto" || overflow === "scroll")) return true;
    }
    return false;
  }
}
