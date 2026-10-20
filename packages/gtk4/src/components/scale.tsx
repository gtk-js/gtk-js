import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkOrientation,
  type GtkPositionType,
} from "../types.ts";

export interface GtkScaleMark {
  value: number;
  position?: GtkPositionType;
  label?: string;
}

export interface GtkScaleProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Current value. */
  value?: number;
  /** Minimum value. Default: 0. */
  min?: number;
  /** Maximum value. Default: 100. */
  max?: number;
  /** Step increment, for arrow keys and +/−. Default: 1. */
  step?: number;
  /** Page increment, for Page Up/Down, Ctrl+arrows and the scroll wheel. Default: 10 × step. */
  pageStep?: number;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Whether to show the current value label. Default: false. */
  drawValue?: boolean;
  /** Position of the value label. Default: "top". */
  valuePos?: GtkPositionType;
  /** Whether to show origin highlight. Default: true. */
  hasOrigin?: boolean;
  /** Whether the scale is inverted. Default: false. */
  inverted?: boolean;
  /** Decimal places for the value label; values are rounded to them while drawValue is on. Default: 1. */
  digits?: number;
  /** Scale marks. */
  marks?: GtkScaleMark[];
  /** Whether the widget is insensitive (disabled). Default: false. */
  disabled?: boolean;
  /** Callback when value changes. */
  onValueChanged?: (value: number) => void;
}

/** A GtkScrollType a GtkScale moves its slider by (gtk_range_scroll()). */
export type GtkScaleScroll =
  | "step-left"
  | "step-right"
  | "step-up"
  | "step-down"
  | "step-backward"
  | "step-forward"
  | "page-left"
  | "page-right"
  | "page-up"
  | "page-down"
  | "page-backward"
  | "page-forward"
  | "start"
  | "end";

/** The move-slider key bindings of gtk_scale_class_init(). */
export function gtkScaleKeyBinding(e: {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): GtkScaleScroll | null {
  if (e.altKey || e.metaKey) return null;
  // "+" needs Shift on most layouts; GTK treats it as consumed.
  if (e.key === "+") return e.ctrlKey ? "page-forward" : "step-forward";
  if (e.key === "-") return e.ctrlKey ? "page-backward" : "step-backward";
  if (e.shiftKey) return null;
  switch (e.key) {
    case "ArrowLeft":
      return e.ctrlKey ? "page-left" : "step-left";
    case "ArrowRight":
      return e.ctrlKey ? "page-right" : "step-right";
    case "ArrowUp":
      return e.ctrlKey ? "page-up" : "step-up";
    case "ArrowDown":
      return e.ctrlKey ? "page-down" : "step-down";
    case "PageUp":
      return e.ctrlKey ? "page-left" : "page-up";
    case "PageDown":
      return e.ctrlKey ? "page-right" : "page-down";
    case "Home":
      return e.ctrlKey ? null : "start";
    case "End":
      return e.ctrlKey ? null : "end";
  }
  return null;
}

export interface GtkScaleRange {
  value: number;
  min: number;
  max: number;
  step: number;
  page: number;
  orientation: GtkOrientation;
  inverted: boolean;
  /** Mark values, in GtkScale's order (descending when inverted). */
  marks: number[];
}

/** Like should_invert_move(): moves along the scale follow `inverted`; across a
 *  horizontal scale up increases the value, across a vertical one right does. */
function shouldInvertMove(
  r: Pick<GtkScaleRange, "orientation" | "inverted">,
  move: GtkOrientation,
): boolean {
  if (move === r.orientation) return r.inverted;
  return r.orientation === "horizontal";
}

/** The value a scroll type moves to, before clamping, like gtk_range_scroll(). */
export function gtkScaleScroll(r: GtkScaleRange, scroll: GtkScaleScroll): number {
  if (scroll === "start") return r.min;
  if (scroll === "end") return r.max;
  const [kind, dir] = scroll.split("-");
  const inc = kind === "page" ? r.page : r.step;
  let forward: boolean;
  if (dir === "forward" || dir === "backward") forward = dir === "forward";
  else {
    const move = dir === "left" || dir === "right" ? "horizontal" : "vertical";
    forward = (dir === "right" || dir === "down") !== shouldInvertMove(r, move);
  }
  const next = r.value + (forward ? inc : -inc);
  // apply_marks(): stop at the first mark the move crosses.
  for (const mark of r.marks) {
    if ((r.value < mark && mark < next) || (r.value > mark && mark > next)) return mark;
  }
  return next;
}

/** Lines per scroll-wheel notch in DOM_DELTA_LINE mode (Firefox). */
const LINES_PER_NOTCH = 3;

/** How much a wheel event changes the value, like
 *  gtk_range_scroll_controller_scroll(): a wheel notch moves a page; smooth
 *  (touchpad) deltas move by the pixels scrolled along the trough. */
export function gtkScaleWheelDelta(
  r: Pick<GtkScaleRange, "min" | "max" | "page" | "orientation" | "inverted">,
  troughLength: number,
  e: {
    deltaX: number;
    deltaY: number;
    deltaMode: number;
    wheelDeltaY?: number;
  },
): number {
  let notches: number | null = null;
  if (e.deltaMode === 1) notches = e.deltaY / LINES_PER_NOTCH;
  else if (e.deltaMode === 2) notches = e.deltaY;
  else if (e.wheelDeltaY && e.wheelDeltaY % 120 === 0) notches = -e.wheelDeltaY / 120;
  let delta: number;
  let move: GtkOrientation;
  if (notches !== null) {
    move = "vertical";
    delta = notches * r.page;
  } else {
    move = r.orientation;
    const px = r.orientation === "horizontal" ? e.deltaX : e.deltaY;
    delta = troughLength > 0 ? (px / troughLength) * (r.max - r.min) : 0;
  }
  return delta !== 0 && shouldInvertMove(r, move) ? -delta : delta;
}

// gtkrange.c timings and constants.
const TIMEOUT_INITIAL = 500;
const TIMEOUT_REPEAT = 250;
const AUTOSCROLL_FACTOR = 20;
const MARK_SNAP_LENGTH = 12;
/** gtk-long-press-time (500ms) × the range's long-press delay factor (2). */
const LONG_PRESS_TIME = 1000;
/** gtk-dnd-drag-threshold: moving further cancels a long press. */
const DRAG_THRESHOLD = 8;

interface Grab {
  pointerId: number;
  location: "slider" | "trough";
  /** slide_initial_slider_position and slide_initial_coordinate_delta. */
  initialPosition: number;
  coordinateDelta: number;
  inDrag: boolean;
  start: { x: number; y: number };
  last: { x: number; y: number };
}

/**
 * GtkScale — A slider widget for selecting a value from a range.
 *
 * CSS node:
 *   scale[.horizontal|.vertical][.marks-before][.marks-after][.fine-tune][.dragging]
 *     ├── [value[.top|.bottom|.left|.right]]
 *     ├── [marks.top]
 *     │   └── mark > [label] + indicator
 *     ├── [marks.bottom]
 *     │   └── mark > indicator + [label]
 *     └── trough
 *         ├── [highlight.top|.bottom]
 *         └── slider
 *
 * @see https://docs.gtk.org/gtk4/class.Scale.html
 * @see upstream/gtk/gtk/gtkrange.c, upstream/gtk/gtk/gtkscale.c
 */
export const GtkScale = forwardRef<HTMLDivElement, GtkScaleProps>(function GtkScale(
  {
    value: controlledValue,
    min = 0,
    max = 100,
    step = 1,
    pageStep = 10 * step,
    orientation = "horizontal",
    drawValue = false,
    valuePos = "top",
    hasOrigin = true,
    inverted = false,
    digits = 1,
    marks,
    disabled = false,
    onValueChanged,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onMouseDown,
    onKeyDown,
    onContextMenu,
    ...rest
  },
  ref,
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(min);
  const value = isControlled ? controlledValue : internalValue;
  // The latest value, for events and timers that fire before a re-render.
  const valueRef = useRef(value);
  valueRef.current = value;

  const isHoriz = orientation === "horizontal";
  const rootRef = useRef<HTMLDivElement | null>(null);
  const troughRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const valueLabelRef = useRef<HTMLSpanElement>(null);
  const [zoom, setZoom] = useState(false);
  const zoomRef = useRef(false);
  const [grabbing, setGrabbing] = useState(false);
  const grabRef = useRef<Grab | null>(null);
  const timers = useRef<{ step?: number; autoscroll?: number; longPress?: number }>({});
  // The slider's margin box along the trough, which gtk_range_compute_slider_position()
  // moves the slider by (Adwaita: 20px - 2 × 8px margin = 4px).
  const [sliderLength, setSliderLength] = useState(4);
  // update_label_request(): the value label is as wide as the wider of min and max.
  const [valueWidth, setValueWidth] = useState<number>();

  const sortedMarks = [...(marks ?? [])].sort((a, b) =>
    inverted ? b.value - a.value : a.value - b.value,
  );
  const isTop = (m: GtkScaleMark) => m.position === "top" || m.position === "left";
  const topMarks = sortedMarks.filter(isTop);
  const bottomMarks = sortedMarks.filter((m) => !isTop(m));

  const range = {
    value,
    min,
    max,
    step,
    page: pageStep,
    orientation,
    inverted,
    marks: sortedMarks.map((m) => m.value),
  };
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const changeRef = useRef((_: number) => {});
  // gtk_range_real_change_value(): clamp, round to the digits shown, and emit
  // value-changed only when the value changes.
  changeRef.current = (raw: number) => {
    let v = Math.max(min, Math.min(max, raw));
    if (drawValue && digits >= 0) {
      const power = 10 ** digits;
      v = Math.floor(v * power + 0.5) / power;
    }
    if (v === valueRef.current) return;
    valueRef.current = v;
    if (!isControlled) setInternalValue(v);
    onValueChanged?.(v);
  };

  useLayoutEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const cs = getComputedStyle(slider);
    const length = isHoriz
      ? slider.offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight)
      : slider.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    if (Number.isFinite(length)) setSliderLength(length);
  });

  const format = (v: number) => v.toFixed(digits);
  const minText = format(min);
  const maxText = format(max);
  useLayoutEffect(() => {
    const label = valueLabelRef.current;
    if (!label) return;
    const measure = () => {
      const probe = label.cloneNode() as HTMLElement;
      probe.style.cssText = "position: absolute; visibility: hidden; min-width: 0";
      label.after(probe);
      let width = 0;
      for (const text of [minText, maxText]) {
        probe.textContent = text;
        width = Math.max(width, probe.getBoundingClientRect().width);
      }
      probe.remove();
      setValueWidth(width);
    };
    measure();
    document.fonts?.ready.then(() => {
      if (valueLabelRef.current === label) measure();
    });
  }, [drawValue, minText, maxText, valuePos, orientation]);

  const fraction = max > min ? (value - min) / (max - min) : 0;
  const along = (length: string): React.CSSProperties =>
    isHoriz ? { left: length } : { top: length };
  /** The slider's center for a fraction: marks and the value label follow it. */
  const sliderCenter = (f: number) =>
    `calc(${inverted ? 1 - f : f} * (100% - ${sliderLength}px) + ${sliderLength / 2}px)`;

  /** The trough's extent and the slider position, in CSS pixels. */
  const trough = () => {
    const el = troughRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const length = isHoriz ? rect.width : rect.height;
    const f = max > min ? (valueRef.current - min) / (max - min) : 0;
    return {
      start: isHoriz ? rect.left : rect.top,
      length,
      sliderPos: (inverted ? 1 - f : f) * (length - sliderLength),
    };
  };
  const pointerCoord = (p: { x: number; y: number }, t: { start: number }) =>
    (isHoriz ? p.x : p.y) - t.start;

  /** coord_to_value(): a scale's trough maps linearly onto the range. */
  const coordToValue = (coord: number, length: number) => {
    let frac = length === sliderLength ? 1 : Math.max(0, Math.min(1, coord / length));
    if (inverted) frac = 1 - frac;
    return min + frac * (max - min);
  };

  const setZoomState = useCallback((on: boolean) => {
    zoomRef.current = on;
    setZoom(on);
  }, []);

  // stop_scrolling(): end the grab, fine-tune and any repeating page/autoscroll.
  const stopScrolling = useCallback(() => {
    grabRef.current = null;
    const t = timers.current;
    window.clearTimeout(t.step);
    window.clearInterval(t.step);
    window.clearTimeout(t.longPress);
    if (t.autoscroll) cancelAnimationFrame(t.autoscroll);
    timers.current = {};
    setZoomState(false);
    setGrabbing(false);
  }, [setZoomState]);

  useEffect(() => stopScrolling, [stopScrolling]);
  // An insensitive widget gets no input and can't keep the focus.
  useEffect(() => {
    if (!disabled) return;
    stopScrolling();
    if (rootRef.current?.contains(document.activeElement)) rootRef.current.blur();
  }, [disabled, stopScrolling]);

  // update_slider_position(): the slider follows the pointer from where it was
  // grabbed, at a quarter of the speed in fine-tune mode, and sticks to a mark it's
  // on while the pointer stays near the mark.
  const updateSliderPosition = (coord: number) => {
    const grab = grabRef.current;
    const t = trough();
    if (!grab || !t) return;
    let zoomFactor = 1;
    if (zoomRef.current) {
      zoomFactor = Math.min(1, t.length / (max - min));
      // "the above is ineffective for scales, so just set a zoom factor"
      if (zoomFactor === 1) zoomFactor = 0.25;
    }
    const c =
      grab.initialPosition + zoomFactor * (coord - (grab.coordinateDelta + grab.initialPosition));
    let newValue = coordToValue(c, t.length);
    const markDelta = Math.abs(coordToValue(c + 1, t.length) - newValue);
    for (const mark of range.marks) {
      if (
        Math.abs(valueRef.current - mark) < 3 * markDelta &&
        Math.abs(newValue - mark) < MARK_SNAP_LENGTH * markDelta
      ) {
        newValue = mark;
        break;
      }
    }
    changeRef.current(newValue);
  };

  const scroll = (type: GtkScaleScroll) =>
    changeRef.current(gtkScaleScroll({ ...rangeRef.current, value: valueRef.current }, type));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(e);
    const t = trough();
    if (disabled || grabRef.current || !t || e.button > 2) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = { x: e.clientX, y: e.clientY };
    const coord = pointerCoord(point, t);
    const grab: Grab = {
      pointerId: e.pointerId,
      location: "slider",
      initialPosition: Math.max(0, t.sliderPos),
      coordinateDelta: 0,
      inDrag: false,
      start: point,
      last: point,
    };
    grabRef.current = grab;
    setGrabbing(true);
    // gtk_range_click_gesture_pressed(): anything outside the slider is the trough.
    const forward = coordToValue(coord, t.length) > valueRef.current;
    if (sliderRef.current?.contains(e.target as Node)) {
      // Grab the slider where it was pressed; Shift-press (or a long press)
      // fine-tunes.
      grab.coordinateDelta = coord - grab.initialPosition;
      if (e.shiftKey) setZoomState(true);
      timers.current.longPress = window.setTimeout(() => {
        const now = trough();
        if (grabRef.current !== grab || zoomRef.current || !now) return;
        grab.initialPosition = Math.max(0, now.sliderPos);
        grab.coordinateDelta = pointerCoord(grab.last, now) - grab.initialPosition;
        setZoomState(true);
      }, LONG_PRESS_TIME);
    } else if (e.pointerType === "touch" || (e.button === 0 && !e.shiftKey)) {
      // gtk-primary-button-warps-slider: jump to the pointer and drag from there.
      updateSliderPosition(coord);
    } else if (e.button !== 2) {
      // Shift+primary or middle click: page towards the pointer, repeating.
      grab.location = "trough";
      const page = () => scroll(forward ? "page-forward" : "page-backward");
      page();
      timers.current.step = window.setTimeout(() => {
        timers.current.step = window.setInterval(page, TIMEOUT_REPEAT);
      }, TIMEOUT_INITIAL);
    } else {
      // Secondary click: scroll towards that end, from a step to two pages per
      // 20 frames the further the pointer moves off the scale (autoscroll_cb()).
      grab.location = "trough";
      const tick = () => {
        const { step: s, page: p } = rangeRef.current;
        const offset = isHoriz ? grab.last.y - grab.start.y : grab.last.x - grab.start.x;
        const k = Math.max(0, Math.min(200, Math.abs(offset) - 20)) / 100;
        const increment = ((1 - k) * s + k * p) / AUTOSCROLL_FACTOR;
        changeRef.current(valueRef.current + (forward ? increment : -increment));
        timers.current.autoscroll = requestAnimationFrame(tick);
      };
      timers.current.autoscroll = requestAnimationFrame(tick);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    const grab = grabRef.current;
    if (grab?.pointerId !== e.pointerId) return;
    grab.last = { x: e.clientX, y: e.clientY };
    if (Math.hypot(e.clientX - grab.start.x, e.clientY - grab.start.y) > DRAG_THRESHOLD) {
      window.clearTimeout(timers.current.longPress);
    }
    const t = trough();
    if (grab.location !== "slider" || !t) return;
    grab.inDrag = true;
    updateSliderPosition(pointerCoord(grab.last, t));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(e);
    if (grabRef.current?.pointerId === e.pointerId) stopScrolling();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerCancel?.(e);
    if (grabRef.current?.pointerId === e.pointerId) stopScrolling();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(e);
    if (disabled || e.button !== 1) return;
    // A middle click pages instead of pasting or autoscrolling the page, and
    // focuses the scale like any press.
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    onContextMenu?.(e);
    if (!disabled) e.preventDefault();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (disabled || e.defaultPrevented) return;
    const grab = grabRef.current;
    // gtk_range_key_controller_key_pressed(): Escape ends a drag; Shift toggles
    // fine-tune during one, continuing from where the slider is.
    if (grab && e.key === "Escape") {
      e.preventDefault();
      stopScrolling();
      return;
    }
    if (grab?.inDrag && e.key === "Shift") {
      const t = trough();
      if (t) grab.initialPosition = t.sliderPos;
      setZoomState(!zoomRef.current);
      return;
    }
    const binding = gtkScaleKeyBinding(e);
    if (!binding) return;
    e.preventDefault();
    scroll(binding);
  };

  // GtkRange's scroll controller consumes every scroll event, which takes a
  // non-passive listener.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || disabled) return;
    const onWheel = (e: WheelEvent & { wheelDeltaY?: number }) => {
      e.preventDefault();
      const t = troughRef.current?.getBoundingClientRect();
      if (!t) return;
      const delta = gtkScaleWheelDelta(rangeRef.current, isHoriz ? t.width : t.height, e);
      if (delta !== 0) changeRef.current(valueRef.current + delta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [disabled, isHoriz]);

  const classes = ["gtk-scale", orientation];
  if (topMarks.length > 0) classes.push("marks-before");
  if (bottomMarks.length > 0) classes.push("marks-after");
  if (zoom) classes.push("fine-tune");
  if (grabbing) classes.push("dragging");
  if (className) classes.push(className);

  const markFraction = (m: GtkScaleMark) => (max > min ? (m.value - min) / (max - min) : 0);
  // gtk_scale_allocate_marks(): each mark is centered where the slider's center
  // would be at its value.
  const renderMarks = (list: GtkScaleMark[], position: "top" | "bottom") =>
    list.length > 0 && (
      <div className={`gtk-marks ${position}`}>
        {list.map((mark, i) => {
          const label = mark.label ? <span className="gtk-label">{mark.label}</span> : null;
          return (
            <div key={i} className="gtk-mark" style={along(sliderCenter(markFraction(mark)))}>
              {position === "top" && label}
              <div className="gtk-indicator" />
              {position === "bottom" && label}
            </div>
          );
        })}
      </div>
    );

  // gtk_scale_allocate_value(): along the trough, the value label is centered on
  // the slider; across it, it sits at the scale's edge.
  const valueFollowsSlider = isHoriz === (valuePos === "top" || valuePos === "bottom");

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-orientation={orientation}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? undefined : 0}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      {...rest}
    >
      {drawValue && (
        <span
          ref={valueLabelRef}
          className={`gtk-value ${valuePos}`}
          style={{
            minWidth: valueWidth,
            ...(valueFollowsSlider && along(sliderCenter(fraction))),
          }}
        >
          {format(value)}
        </span>
      )}
      {renderMarks(topMarks, "top")}
      {renderMarks(bottomMarks, "bottom")}
      <div
        ref={troughRef}
        className="gtk-trough"
        // gtk_range_compute_slider_position(): the slider's margin box starts at
        // this fraction of the trough's length less its own, which layout.css
        // lays out with the slider's actual CSS margins (right before hydration too).
        style={
          {
            "--gtk-scale-slider-position": inverted ? 1 - fraction : fraction,
          } as React.CSSProperties
        }
      >
        {hasOrigin && (
          <div
            className={`gtk-highlight ${inverted ? "bottom" : "top"}`}
            style={isHoriz ? { width: `${fraction * 100}%` } : { height: `${fraction * 100}%` }}
          />
        )}
        <div ref={sliderRef} className="gtk-slider" data-disabled={disabled || undefined} />
      </div>
    </div>
  );
});
