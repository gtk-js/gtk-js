import type { GtkOrientation } from "@gtk-js/gtk4";
import {
  Children,
  type CSSProperties,
  type DragEvent,
  type FocusEvent,
  type ForwardedRef,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { animateSpring, type SpringAnimationHandle, type SpringParams } from "../spring.ts";
import {
  DRAG_THRESHOLD_DISTANCE,
  SwipeTracker,
  TOUCHPAD_BASE_DISTANCE_H,
  TOUCHPAD_BASE_DISTANCE_V,
} from "../swipe-tracker.ts";

/** adw_carousel_init(): scroll_to() animates with adw_spring_params_new (1, 0.5, 500), clamped. */
const SCROLL_SPRING: SpringParams = { dampingRatio: 1, mass: 0.5, stiffness: 500 };
/** After a wheel notch changes the page, wheel events pass on for this long (ms). */
const SCROLL_TIMEOUT_DURATION = 150;
/**
 * GTK ends a touchpad swipe on the scroll-stop event when the fingers lift.
 * Browsers send none, so the swipe ends once wheel events pause this long (ms).
 */
const TOUCHPAD_SWIPE_END_DELAY = 150;

export interface AdwCarouselProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The page to show. Changing it scrolls there with an animation, like
   * adw_carousel_scroll_to(). Swipes, the wheel and keys change pages too and
   * report them through `onPageChanged`: keep `page` in sync from there.
   */
  page?: number;
  /** Whether the user can swipe, scroll or use keys to change pages. `page` works either way. Default: true. */
  interactive?: boolean;
  /** Spacing between pages, in pixels. Default: 0. */
  spacing?: number;
  /** Whether the mouse can drag pages. Touch always can. Default: true. */
  allowMouseDrag?: boolean;
  /** Whether a mouse wheel changes pages. Default: true. */
  allowScrollWheel?: boolean;
  /** Whether one swipe can go further than the next page. Default: false. */
  allowLongSwipes?: boolean;
  orientation?: GtkOrientation;
  /** Called with the page once a page change has finished animating (AdwCarousel::page-changed). */
  onPageChanged?: (index: number) => void;
  /**
   * Called with the scroll position, in pages, whenever it changes: fractional
   * while swiping or animating (AdwCarousel:position). Pass it to an indicator.
   */
  onPositionChanged?: (position: number) => void;
  children?: ReactNode;
}

function useRefs<T>(ref: ForwardedRef<T>, own: RefObject<T | null>) {
  return useCallback(
    (el: T | null) => {
      own.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref, own],
  );
}

const isRtl = (el: Element) => getComputedStyle(el).direction === "rtl";

/**
 * Whether a wheel event comes from a mouse wheel rather than a touchpad. GTK
 * pages with the wheel and swipes with the touchpad, by the device's source
 * (GDK_SOURCE_MOUSE / GDK_SOURCE_TOUCHPAD). Browsers don't say: wheels scroll
 * by lines or by whole notches (wheelDelta, 120 a notch), touchpads by pixels.
 */
function isWheelNotch(e: WheelEvent): boolean {
  if (e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return true;
  const legacy = e as WheelEvent & { wheelDeltaX?: number; wheelDeltaY?: number };
  const notch = legacy.wheelDeltaY || legacy.wheelDeltaX || 0;
  return notch !== 0 && notch % 120 === 0;
}

/**
 * Whether something in a page scrolls along the wheel event's axis, like a
 * GtkScrolledWindow, which gets the event before the carousel does.
 */
function scrollsInPage(e: WheelEvent, carousel: Element): boolean {
  const scrolls = (overflow: string) => overflow === "auto" || overflow === "scroll";
  for (let el = e.target as Element | null; el && el !== carousel; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (e.deltaY && scrolls(style.overflowY) && el.scrollHeight > el.clientHeight) return true;
    if (e.deltaX && scrolls(style.overflowX) && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

const isEditable = (el: Element) =>
  (el as HTMLElement).isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

interface Drag {
  id: number;
  x: number;
  y: number;
  prevOffset: number;
  state: "none" | "pending" | "scrolling" | "rejected";
}

/**
 * AdwCarousel — A paginated scrolling widget.
 *
 * CSS node: carousel[.horizontal|.vertical], with a page per child.
 *
 * Pages are laid out like adw_carousel_size_allocate() (see layout.css) and
 * moved by the carousel's position, in pages. Swipes work like
 * AdwSwipeTracker's: touch, mouse drags and touchpad scrolls follow the
 * pointer and end on the page their velocity points to. A mouse wheel notch,
 * the arrow keys, Page Up/Down and Home/End change the page, which the
 * carousel then scrolls to with its spring.
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.Carousel.html
 */
export const AdwCarousel = forwardRef<HTMLDivElement, AdwCarouselProps>(function AdwCarousel(
  {
    page,
    interactive = true,
    spacing = 0,
    allowMouseDrag = true,
    allowScrollWheel = true,
    allowLongSwipes = false,
    orientation = "horizontal",
    onPageChanged,
    onPositionChanged,
    children,
    className,
    style,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    onDragStart,
    onFocus,
    ...rest
  },
  ref,
) {
  // A page per child, like adw_carousel_append(): null and false aren't pages.
  const pages = Children.toArray(children);
  const nPages = pages.length;
  const lastPage = Math.max(nPages - 1, 0);
  const isHoriz = orientation === "horizontal";

  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRef = useRefs(ref, rootRef);
  const latest = useRef({ nPages, interactive, allowScrollWheel, isHoriz });
  latest.current = { nPages, interactive, allowScrollWheel, isHoriz };
  const callbacks = useRef({ onPageChanged, onPositionChanged });
  callbacks.current = { onPageChanged, onPositionChanged };

  const position = useRef(Math.min(Math.max(page ?? 0, 0), lastPage));
  const animation = useRef<SpringAnimationHandle | null>(null);
  const [tracker] = useState(() => new SwipeTracker());
  tracker.points = Array.from({ length: lastPage + 1 }, (_, i) => i);
  tracker.allowLongSwipes = allowLongSwipes;

  /** set_position() */
  const setPosition = useCallback((value: number) => {
    const p = Math.min(Math.max(value, 0), Math.max(latest.current.nPages - 1, 0));
    if (p === position.current) return;
    position.current = p;
    rootRef.current?.style.setProperty("--gtk-carousel-position", String(p));
    callbacks.current.onPositionChanged?.(p);
  }, []);

  /** scroll_to(): page-changed comes once the animation is done. */
  const scrollTo = useCallback(
    (index: number, velocity = 0) => {
      const n = latest.current.nPages;
      if (n === 0) return;
      animation.current?.cancel();
      animation.current = animateSpring({
        params: SCROLL_SPRING,
        from: position.current,
        to: Math.min(Math.max(index, 0), n - 1),
        initialVelocity: velocity,
        clamp: true,
        onValue: setPosition,
        onDone: () => {
          animation.current = null;
          callbacks.current.onPageChanged?.(Math.round(position.current));
        },
      });
    },
    [setPosition],
  );

  /** begin_swipe_cb(): the swipe takes over from a running animation. */
  const beginSwipe = useCallback(() => {
    animation.current?.cancel();
    animation.current = null;
  }, []);

  /** end_swipe_cb() */
  const endSwipe = useCallback(
    ({ velocity, to }: { velocity: number; to: number }) => scrollTo(Math.round(to), velocity),
    [scrollTo],
  );

  // Pages removed from under the position: set_position() keeps it in range.
  useLayoutEffect(() => {
    if (position.current > lastPage) setPosition(lastPage);
  }, [lastPage, setPosition]);

  const shownPage = useRef(page);
  useEffect(() => {
    if (page === undefined || page === shownPage.current) return;
    shownPage.current = page;
    if (page !== position.current) scrollTo(page);
  }, [page, scrollTo]);

  useEffect(() => () => animation.current?.cancel(), []);

  // --- drags ---------------------------------------------------------------

  const drag = useRef<Drag | null>(null);
  const touchpad = useRef<{ time: number; timer: number } | null>(null);
  const clickClaimed = useRef(false);

  /** adw_carousel_get_distance(): a page's size plus the spacing. */
  const distance = (root: Element) => {
    const rect = root.firstElementChild?.getBoundingClientRect();
    return (rect ? (isHoriz ? rect.width : rect.height) : 0) + spacing;
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(e);
    if (!interactive || drag.current?.state === "scrolling" || touchpad.current) return;
    if (e.pointerType === "mouse" ? !allowMouseDrag || e.button !== 0 : !e.isPrimary) return;
    // A child that drags on its own (a scale, a switch) has taken the pointer:
    // the carousel's gesture comes after the children's.
    for (let el = e.target as Element | null; el && el !== e.currentTarget; el = el.parentElement) {
      if (el.hasPointerCapture(e.pointerId)) return;
    }
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, prevOffset: 0, state: "none" };
  };

  /** drag_update_cb() */
  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    const d = drag.current;
    if (!d || e.pointerId !== d.id || d.state === "rejected") return;
    // Released outside the carousel before the swipe took the pointer.
    if (e.pointerType === "mouse" && !(e.buttons & 1)) {
      drag.current = null;
      return tracker.reset();
    }
    const root = e.currentTarget;
    const ox = e.clientX - d.x;
    const oy = e.clientY - d.y;
    // Positive towards the next page.
    const offset = (isHoriz ? ox : oy) * (isHoriz && isRtl(root) ? 1 : -1);
    const delta = offset - d.prevOffset;
    d.prevOffset = offset;
    const offsetVertical = Math.abs(oy) > Math.abs(ox);
    const reject = () => {
      d.state = "rejected";
      tracker.reset();
    };

    tracker.record(delta, e.timeStamp);
    if (d.state === "none") {
      if (isHoriz === offsetVertical) return reject();
      tracker.prepare(position.current);
      d.state = "pending";
    }
    if (d.state === "pending") {
      if (Math.hypot(ox, oy) < DRAG_THRESHOLD_DISTANCE) return;
      if (
        isHoriz === offsetVertical ||
        lastPage === 0 ||
        (offset < 0 && tracker.progress <= 0) ||
        (offset > 0 && tracker.progress >= lastPage)
      ) {
        return reject();
      }
      // gesture_begin(): the swipe claims the pointer, so children get no click.
      beginSwipe();
      d.state = "scrolling";
      d.prevOffset = offset;
      root.setPointerCapture(e.pointerId);
      clickClaimed.current = true;
    }
    setPosition(tracker.update(delta / distance(root)));
  };

  /** drag_end_cb() / drag_cancel_cb() */
  const endDrag = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.state !== "scrolling") return tracker.reset();
    endSwipe(tracker.end(e.timeStamp, false, cancelled));
    // The click that follows the release is the swipe's.
    setTimeout(() => {
      clickClaimed.current = false;
    });
  };

  const handleClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    onClickCapture?.(e);
    if (!clickClaimed.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  // Images and links would start a native drag instead.
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    onDragStart?.(e);
    if (drag.current && !(e.target as Element).closest('[draggable="true"]')) e.preventDefault();
  };

  // --- wheel and touchpad --------------------------------------------------

  // Not React's onWheel, which is passive: the carousel stops the events it uses.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let wheelLocked = false;
    let wheelTimer = 0;

    const endTouchpadSwipe = () => {
      const t = touchpad.current;
      if (!t) return;
      touchpad.current = null;
      endSwipe(tracker.end(t.time, true));
    };

    /** The swipe tracker's handle_scroll_event(). */
    const touchpadScroll = (e: WheelEvent) => {
      const { interactive, isHoriz, nPages } = latest.current;
      if (!interactive) return;
      const delta = (isHoriz ? e.deltaX : e.deltaY) * (isHoriz && isRtl(root) ? -1 : 1);
      if (!touchpad.current) {
        if (scrollsInPage(e, root)) return;
        // The tracker only takes scrolls along the carousel.
        const across = isHoriz ? e.deltaY : e.deltaX;
        if (delta === 0 || Math.abs(across) > Math.abs(delta)) return;
        const last = Math.max(nPages - 1, 0);
        const progress = position.current;
        if (last === 0 || (delta < 0 && progress <= 0) || (delta > 0 && progress >= last)) return;
        beginSwipe();
        tracker.prepare(progress);
        touchpad.current = { time: e.timeStamp, timer: 0 };
      }
      const t = touchpad.current;
      e.preventDefault();
      tracker.record(delta, e.timeStamp);
      const base = isHoriz ? TOUCHPAD_BASE_DISTANCE_H : TOUCHPAD_BASE_DISTANCE_V;
      setPosition(tracker.update(delta / base));
      t.time = e.timeStamp;
      window.clearTimeout(t.timer);
      t.timer = window.setTimeout(endTouchpadSwipe, TOUCHPAD_SWIPE_END_DELAY);
    };

    /** scroll_cb(): a wheel notch changes the page. */
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented || drag.current?.state === "scrolling") return;
      if (touchpad.current || !isWheelNotch(e)) return touchpadScroll(e);
      const { allowScrollWheel, interactive, nPages, isHoriz } = latest.current;
      if (!allowScrollWheel || wheelLocked || !interactive || nPages === 0) return;
      if (scrollsInPage(e, root)) return;
      // Mice rarely scroll sideways, so their vertical wheel pages either way.
      let step = Math.sign(e.deltaY);
      if (isHoriz && step === 0) step = Math.sign(e.deltaX);
      if (step === 0) return;
      e.preventDefault();
      scrollTo(Math.round(position.current) + step);
      wheelLocked = true;
      wheelTimer = window.setTimeout(() => {
        wheelLocked = false;
      }, SCROLL_TIMEOUT_DURATION);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      root.removeEventListener("wheel", onWheel);
      window.clearTimeout(wheelTimer);
      window.clearTimeout(touchpad.current?.timer);
      touchpad.current = null;
    };
  }, [scrollTo, setPosition, beginSwipe, endSwipe, tracker]);

  // --- keys ----------------------------------------------------------------

  /**
   * keynav_cb() / keynav_bounds_cb(): class key bindings, so they work while
   * anything in the carousel has the focus.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !interactive || nPages === 0) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    // Text fields use these keys themselves.
    if (isEditable(e.target as Element)) return;
    const current = Math.round(position.current);
    const forward = isHoriz && isRtl(e.currentTarget) ? -1 : 1;
    let to: number | undefined;
    switch (e.key) {
      case "ArrowLeft":
        if (isHoriz) to = current - forward;
        break;
      case "ArrowRight":
        if (isHoriz) to = current + forward;
        break;
      case "ArrowUp":
        if (!isHoriz) to = current - 1;
        break;
      case "ArrowDown":
        if (!isHoriz) to = current + 1;
        break;
      case "PageUp":
        to = current - 1;
        break;
      case "PageDown":
        to = current + 1;
        break;
      case "Home":
        to = 0;
        break;
      case "End":
        to = lastPage;
        break;
    }
    if (to === undefined) return;
    // The binding takes the key even with nowhere to go.
    e.preventDefault();
    if (to >= 0 && to <= lastPage) scrollTo(to);
  };

  // Not in GTK, which leaves a widget focused off screen: keyboard focus
  // brings its page into view, as browsers scroll focused elements into view.
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    onFocus?.(e);
    const target = e.target as Element;
    if (!interactive || !target.matches(":focus-visible")) return;
    const index = Array.from(e.currentTarget.children).findIndex((p) => p.contains(target));
    if (index >= 0 && index !== Math.round(position.current)) scrollTo(index);
  };

  const classes = ["gtk-carousel", orientation];
  if (className) classes.push(className);

  return (
    <div
      ref={setRef}
      className={classes.join(" ")}
      {...rest}
      style={
        {
          "--gtk-carousel-position": position.current,
          "--gtk-carousel-spacing": `${spacing}px`,
          // The carousel takes touch swipes along its axis.
          touchAction: interactive
            ? isHoriz
              ? "pan-y pinch-zoom"
              : "pan-x pinch-zoom"
            : undefined,
          ...style,
        } as CSSProperties
      }
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        endDrag(e, false);
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        endDrag(e, true);
      }}
      onClickCapture={handleClickCapture}
      onDragStart={handleDragStart}
      onFocus={handleFocus}
    >
      {pages.map((child, i) => (
        <div
          key={isValidElement(child) && child.key !== null ? child.key : i}
          className="gtk-bin-layout"
          style={{ "--gtk-carousel-index": i } as CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
});

/* ---------- Indicators ---------- */

interface IndicatorBox {
  /** gtk_widget_get_width() / get_height(), along and across the orientation. */
  length: number;
  thickness: number;
  rtl: boolean;
}

/** The size the indicator draws in, and its direction. Until measured, its natural size. */
function useIndicatorBox(
  ref: RefObject<HTMLDivElement | null>,
  horizontal: boolean,
  natural: IndicatorBox,
): IndicatorBox {
  const [box, setBox] = useState<IndicatorBox | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = {
        length: horizontal ? el.clientWidth : el.clientHeight,
        thickness: horizontal ? el.clientHeight : el.clientWidth,
        rtl: isRtl(el),
      };
      setBox((b) =>
        b?.length === next.length && b.thickness === next.thickness && b.rtl === next.rtl
          ? b
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, horizontal]);
  return box ?? natural;
}

/**
 * Where an indicator's first item starts: centered, on the pixel grid when
 * the indicator isn't animating (the `widget_length--` in snapshot_dots()).
 */
function indicatorStart(length: number, indicatorLength: number, itemSize: number): number {
  let widgetLength = length;
  if ((widgetLength - Math.round(indicatorLength / itemSize) * itemSize) % 2 === 0) widgetLength--;
  return (widgetLength - indicatorLength) / 2;
}

/** A horizontal indicator mirrors the position in RTL, as the carousel mirrors its pages. */
const indicatorPosition = (position: number, nPages: number, horizontal: boolean, rtl: boolean) =>
  horizontal && rtl ? nPages - 1 - position : position;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The indicator's snapshot(): an SVG drawing over the widget, which keeps the
 * fractional positions GTK draws at (CSS boxes would snap to whole pixels).
 */
function IndicatorDrawing({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    >
      {children}
    </svg>
  );
}

function IndicatorWidget({
  name,
  horizontal,
  length,
  thickness,
  drawing,
  className,
  style,
  setRef,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  name: string;
  horizontal: boolean;
  length: number;
  thickness: number;
  /** What snapshot() draws: nothing for fewer than two pages. */
  drawing: ReactNode[];
  setRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={setRef}
      className={[name, className].filter(Boolean).join(" ")}
      style={{
        position: "relative",
        [horizontal ? "minWidth" : "minHeight"]: length,
        [horizontal ? "minHeight" : "minWidth"]: thickness,
        ...style,
      }}
      {...rest}
    >
      {drawing.length > 0 && <IndicatorDrawing>{drawing}</IndicatorDrawing>}
    </div>
  );
}

const DOTS_RADIUS = 3;
const DOTS_RADIUS_SELECTED = 4;
const DOTS_OPACITY = 0.3;
const DOTS_OPACITY_SELECTED = 0.9;
const DOTS_SPACING = 7;
const DOTS_MARGIN = 6;

export interface AdwCarouselIndicatorDotsProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of pages in the carousel. */
  nPages: number;
  /** The carousel's position, from its `onPositionChanged`. */
  position: number;
  /** Default: horizontal. */
  orientation?: GtkOrientation;
}

/**
 * AdwCarouselIndicatorDots — A dot per carousel page. The current page's dot
 * is larger and more opaque, gradually, following the position.
 *
 * CSS node: carouselindicatordots. The dots are drawn like snapshot_dots().
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.CarouselIndicatorDots.html
 */
export const AdwCarouselIndicatorDots = forwardRef<HTMLDivElement, AdwCarouselIndicatorDotsProps>(
  function AdwCarouselIndicatorDots(
    { nPages, position, orientation = "horizontal", ...rest },
    ref,
  ) {
    const own = useRef<HTMLDivElement | null>(null);
    const setRef = useRefs(ref, own);
    const horizontal = orientation === "horizontal";
    const dotSize = 2 * DOTS_RADIUS_SELECTED + DOTS_SPACING;
    // adw_carousel_indicator_dots_measure()
    const length = nPages * dotSize + 2 * DOTS_MARGIN;
    const thickness = 2 * DOTS_RADIUS_SELECTED + 2 * DOTS_MARGIN;
    const box = useIndicatorBox(own, horizontal, { length, thickness, rtl: false });

    const dots: ReactNode[] = [];
    if (nPages >= 2) {
      const p = indicatorPosition(position, nPages, horizontal, box.rtl);
      const start = indicatorStart(box.length, nPages * dotSize - DOTS_SPACING, dotSize);
      const across = Math.trunc(box.thickness / 2);
      let remaining = 1;
      for (let i = 0; i < nPages; i++) {
        const progress = Math.min(Math.max(i + 1 - p, 0), remaining);
        remaining -= progress;
        const along = start + dotSize * (i + 0.5);
        dots.push(
          <circle
            key={i}
            cx={horizontal ? along : across}
            cy={horizontal ? across : along}
            r={lerp(DOTS_RADIUS, DOTS_RADIUS_SELECTED, progress)}
            fill="currentColor"
            opacity={lerp(DOTS_OPACITY, DOTS_OPACITY_SELECTED, progress)}
          />,
        );
      }
    }

    return (
      <IndicatorWidget
        name="gtk-carouselindicatordots"
        horizontal={horizontal}
        length={length}
        thickness={thickness}
        drawing={dots}
        setRef={setRef}
        {...rest}
      />
    );
  },
);

const LINE_WIDTH = 3;
const LINE_LENGTH = 35;
const LINE_SPACING = 5;
const LINE_OPACITY = 0.3;
const LINE_OPACITY_ACTIVE = 0.9;
const LINE_MARGIN = 2;

export interface AdwCarouselIndicatorLinesProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of pages in the carousel. */
  nPages: number;
  /** The carousel's position, from its `onPositionChanged`. */
  position: number;
  /** Default: horizontal. */
  orientation?: GtkOrientation;
}

/**
 * AdwCarouselIndicatorLines — A line per carousel page, and one over them
 * that moves with the position.
 *
 * CSS node: carouselindicatorlines. The lines are drawn like snapshot_lines().
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.CarouselIndicatorLines.html
 */
export const AdwCarouselIndicatorLines = forwardRef<HTMLDivElement, AdwCarouselIndicatorLinesProps>(
  function AdwCarouselIndicatorLines(
    { nPages, position, orientation = "horizontal", ...rest },
    ref,
  ) {
    const own = useRef<HTMLDivElement | null>(null);
    const setRef = useRefs(ref, own);
    const horizontal = orientation === "horizontal";
    const lineSize = LINE_LENGTH + LINE_SPACING;
    // adw_carousel_indicator_lines_measure()
    const length = nPages * lineSize + 2 * LINE_MARGIN;
    const thickness = LINE_WIDTH + 2 * LINE_MARGIN;
    const box = useIndicatorBox(own, horizontal, { length, thickness, rtl: false });

    const lines: ReactNode[] = [];
    if (nPages >= 2) {
      const p = indicatorPosition(position, nPages, horizontal, box.rtl);
      const start = indicatorStart(box.length, nPages * lineSize - LINE_SPACING, lineSize);
      const across = Math.trunc((box.thickness - LINE_WIDTH) / 2);
      const line = (key: string, at: number, opacity: number) => (
        <rect
          key={key}
          x={horizontal ? start + at : across}
          y={horizontal ? across : start + at}
          width={horizontal ? LINE_LENGTH : LINE_WIDTH}
          height={horizontal ? LINE_WIDTH : LINE_LENGTH}
          fill="currentColor"
          opacity={opacity}
        />
      );
      // A line per page, then the active one over them.
      for (let i = 0; i < nPages; i++) lines.push(line(String(i), i * lineSize, LINE_OPACITY));
      lines.push(line("active", p * lineSize, LINE_OPACITY_ACTIVE));
    }

    return (
      <IndicatorWidget
        name="gtk-carouselindicatorlines"
        horizontal={horizontal}
        length={length}
        thickness={thickness}
        drawing={lines}
        setRef={setRef}
        {...rest}
      />
    );
  },
);
