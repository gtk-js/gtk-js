/**
 * The progress math of AdwSwipeTracker: a swipe moves a swipeable between its
 * snap points, following a drag (touch, or the mouse when allowed) or a
 * touchpad scroll. It goes no further than the snap points next to where it
 * started unless long swipes are allowed, and ends on the snap point its
 * velocity points to. Like AdwCarousel's tracker, it doesn't overshoot.
 *
 * @see upstream/libadwaita/src/adw-swipe-tracker.c
 */

/** How far (px) a drag goes before it becomes a swipe. */
export const DRAG_THRESHOLD_DISTANCE = 16;
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
const EPSILON = 0.005;
const DBL_EPSILON = Number.EPSILON;

const approx = (a: number, b: number) => Math.abs(a - b) < DBL_EPSILON;

/** The snap point at `index`; the snap point list is never empty. */
const at = (points: number[], index: number) => points[index] ?? 0;

function findClosestPoint(points: number[], pos: number): number {
  let min = 0;
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(at(points, i) - pos) < Math.abs(at(points, min) - pos)) min = i;
  }
  return min;
}

function findNextPoint(points: number[], pos: number): number {
  return points.findIndex((point) => approx(point, pos) || point > pos);
}

function findPreviousPoint(points: number[], pos: number): number {
  return points.findLastIndex((point) => approx(point, pos) || point < pos);
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

export class SwipeTracker {
  /** The swipeable's snap points, ascending (adw_swipeable_get_snap_points()). */
  points: number[] = [0];
  allowLongSwipes = false;
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
    this.progress = Math.min(Math.max(this.progress + delta, lower), upper);
    return this.progress;
  }

  /**
   * gesture_end(): the velocity (px/ms) the swipe ends with and the snap point
   * it goes to. A cancelled swipe goes back to the closest one, like
   * adw_carousel_get_cancel_progress().
   */
  end(time: number, isTouchpad: boolean, cancelled = false): { velocity: number; to: number } {
    this.trim(time);
    const velocity = this.velocity();
    const to = cancelled
      ? at(this.points, findClosestPoint(this.points, this.progress))
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

    if (speed < (isTouchpad ? VELOCITY_THRESHOLD_TOUCHPAD : VELOCITY_THRESHOLD_TOUCH)) {
      return clamp(at(points, findClosestPoint(points, this.progress)));
    }

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
