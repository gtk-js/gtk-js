import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { noFocusOnClick } from "../focus-on-click.ts";
import { observeSize, scheduleLayout } from "../layouts/layout-pass.ts";
import { alignAttrs, type GtkAlignProps, type GtkOrientation } from "../types.ts";

export interface GtkScrollbarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Scrollbar direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Current scroll position (0.0 to 1.0). Uncontrolled (starting at 0) when omitted. */
  value?: number;
  /** Size of the visible area relative to total (0.0 to 1.0). */
  pageSize?: number;
  /** Callback when the user moves the slider (drag, trough click, wheel). */
  onValueChanged?: (value: number) => void;
  /** Whether the scrollbar is insensitive (GtkWidget:sensitive = FALSE). Default: false. */
  disabled?: boolean;
}

/** Like gtk_range_add_step_timer(): a page jump repeats while the button is held. */
const TIMEOUT_INITIAL = 500;
const TIMEOUT_REPEAT = 250;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Where the slider's margin box sits in a trough of `troughLength` px, as in
 * gtk_range_compute_slider_position(): it is the visible fraction of the
 * trough but at least `minLength` (the slider's minimum), and it travels the
 * rest of the trough.
 */
export function sliderGeometry(
  value: number,
  pageSize: number,
  troughLength: number,
  minLength: number,
): { position: number; length: number } {
  let length = Math.floor(troughLength * clamp01(pageSize));
  length = Math.min(Math.max(length, minLength), troughLength);
  const position = Math.floor((troughLength - length) * clamp01(value));
  return { position: Math.max(0, position), length };
}

/**
 * The value for a slider (margin box) starting `coord` px into the trough,
 * like coord_to_value(): the inverse of sliderGeometry().
 */
export function coordToValue(coord: number, troughLength: number, sliderLength: number): number {
  if (troughLength === sliderLength) return 1;
  return clamp01(coord / (troughLength - sliderLength));
}

/** One page increment (90% of the page, as a scrolled window's adjustments have) in value units. */
function pageIncrement(pageSize: number): number {
  return pageSize >= 1 ? 0 : (0.9 * pageSize) / (1 - pageSize);
}

/**
 * The value a wheel event scrolls to, like gtk_range_scroll_controller_scroll():
 * a page increment per wheel detent.
 */
export function wheelValue(
  value: number,
  pageSize: number,
  delta: number,
  deltaMode: number,
): number {
  // A detent is 3 lines, or 100 pixels in pixel mode.
  const detents = deltaMode === 2 ? delta : deltaMode === 1 ? delta / 3 : delta / 100;
  return clamp01(value + detents * pageIncrement(pageSize));
}

/**
 * GtkScrollbar — A standalone scrollbar widget.
 *
 * CSS node:
 *   scrollbar[.horizontal|.vertical]
 *     └── range[.dragging]
 *         └── trough
 *             └── slider
 *
 * GtkScrolledWindow's scrollbars are these. As in GtkRange, pressing the
 * slider grabs it where it was pressed, a click in the trough centers the
 * slider on the pointer (gtk-primary-button-warps-slider), Shift+click or a
 * middle click pages towards the pointer while held, and the wheel moves it
 * by pages.
 *
 * @see https://docs.gtk.org/gtk4/class.Scrollbar.html
 */
export const GtkScrollbar = forwardRef<HTMLDivElement, GtkScrollbarProps>(function GtkScrollbar(
  {
    orientation = "horizontal",
    value: controlledValue,
    pageSize = 0.2,
    onValueChanged,
    disabled = false,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    onMouseDown,
    onPointerDown,
    onWheel,
    ...rest
  },
  ref,
) {
  const [internalValue, setInternalValue] = useState(0);
  const value = clamp01(controlledValue ?? internalValue);
  const isHoriz = orientation === "horizontal";

  const troughRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  // The pointer's distance from the slider's start while it is grabbed
  // (slide_initial_coordinate_delta).
  const grab = useRef<{ pointerId: number; delta: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The trough's length, and the slider's minimum and the room its margins,
  // borders and padding take along the trough: the slider is placed in pixels.
  const [metrics, setMetrics] = useState<{ trough: number; min: number; extra: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    const trough = troughRef.current;
    const slider = sliderRef.current;
    if (!trough || !slider) return;
    const [start, end] = isHoriz ? ["left", "right"] : ["top", "bottom"];
    // Reads the metrics, and returns the write that stores them.
    const measure = () => {
      const s = getComputedStyle(slider);
      const px = (...props: string[]) =>
        props.reduce((sum, p) => sum + (parseFloat(s.getPropertyValue(p)) || 0), 0);
      const extra = px(
        `margin-${start}`,
        `margin-${end}`,
        `border-${start}-width`,
        `border-${end}-width`,
        `padding-${start}`,
        `padding-${end}`,
      );
      const next = {
        trough: isHoriz ? trough.clientWidth : trough.clientHeight,
        min: px(isHoriz ? "min-width" : "min-height") + extra,
        extra,
      };
      return () =>
        setMetrics((prev) =>
          prev && prev.trough === next.trough && prev.min === next.min && prev.extra === next.extra
            ? prev
            : next,
        );
    };
    measure()();
    // In the layout pass, when the trough resizes.
    return observeSize(trough, () => scheduleLayout(measure));
  }, [isHoriz]);

  const setValue = useCallback(
    (next: number) => {
      if (controlledValue === undefined) setInternalValue(next);
      onValueChanged?.(next);
    },
    [controlledValue, onValueChanged],
  );

  // The slider's place is an allocation in GTK: of the theme's transitions,
  // keep the ones on its style, not its position.
  let sliderStyle: React.CSSProperties = {
    transitionProperty:
      "background-color, border-color, outline-color, opacity, min-width, min-height, margin",
  };
  // The trough is at least as long as the slider (gtk_range_measure_trough()).
  let troughStyle: React.CSSProperties | undefined;
  if (metrics) {
    const { position, length } = sliderGeometry(value, pageSize, metrics.trough, metrics.min);
    const size = Math.max(0, length - metrics.extra);
    sliderStyle = {
      ...sliderStyle,
      ...(isHoriz ? { left: position, width: size } : { top: position, height: size }),
    };
    troughStyle = isHoriz ? { minWidth: metrics.min } : { minHeight: metrics.min };
  } else {
    const size = clamp01(pageSize);
    sliderStyle = {
      ...sliderStyle,
      ...(isHoriz
        ? { left: `${value * (1 - size) * 100}%`, width: `${size * 100}%` }
        : { top: `${value * (1 - size) * 100}%`, height: `${size * 100}%` }),
    };
  }

  /** The pointer and the slider's margin box along the trough, in trough coordinates. */
  const locate = (e: React.PointerEvent) => {
    const sliderEl = sliderRef.current;
    const trough = troughRef.current?.getBoundingClientRect();
    if (!trough || !sliderEl) return null;
    const slider = sliderEl.getBoundingClientRect();
    const s = getComputedStyle(sliderEl);
    const [axis, size] = isHoriz ? (["left", "width"] as const) : (["top", "height"] as const);
    const m0 = parseFloat(isHoriz ? s.marginLeft : s.marginTop) || 0;
    const m1 = parseFloat(isHoriz ? s.marginRight : s.marginBottom) || 0;
    return {
      pointer: (isHoriz ? e.clientX : e.clientY) - trough[axis],
      start: slider[axis] - m0 - trough[axis],
      trough: trough[size],
      slider: slider[size] + m0 + m1,
    };
  };

  const stopScrolling = useCallback(() => {
    grab.current = null;
    clearTimeout(timer.current);
    timer.current = undefined;
    setDragging(false);
  }, []);
  useEffect(() => stopScrolling, [stopScrolling]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || grab.current || timer.current) return;
    const at = locate(e);
    if (!at) return;
    const onSlider = sliderRef.current?.contains(e.target as Node) ?? false;
    const primary = e.button === 0;
    const pageJump = !onSlider && ((primary && e.shiftKey) || e.button === 1);
    if (!primary && !pageJump) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);

    if (pageJump) {
      // Pages towards the pointer until released (gtk_range_add_step_timer()).
      const step = pageIncrement(pageSize);
      const forward = coordToValue(at.pointer, at.trough, at.slider) > value;
      let current = value;
      const scroll = () => {
        current = clamp01(current + (forward ? step : -step));
        setValue(current);
      };
      scroll();
      timer.current = setTimeout(() => {
        timer.current = setInterval(scroll, TIMEOUT_REPEAT);
      }, TIMEOUT_INITIAL);
      return;
    }

    // Pressing the slider grabs it where it was pressed; a click in the trough
    // warps the slider's center to the pointer (gtk_range_click_gesture_pressed()).
    const delta = onSlider ? at.pointer - at.start : at.slider / 2;
    grab.current = { pointerId: e.pointerId, delta };
    if (!onSlider) setValue(coordToValue(at.pointer - delta, at.trough, at.slider));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const at = locate(e);
    if (at) setValue(coordToValue(at.pointer - g.delta, at.trough, at.slider));
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    onWheel?.(e);
    if (disabled || e.defaultPrevented) return;
    const delta = isHoriz && e.deltaX !== 0 ? e.deltaX : e.deltaY;
    if (delta !== 0) setValue(wheelValue(value, pageSize, delta, e.deltaMode));
  };

  const classes = ["gtk-scrollbar", "gtk-box-layout", orientation];
  if (className) classes.push(className);
  // range_grab_add() marks the range while the pointer holds it.
  const rangeClasses = dragging ? "gtk-range dragging" : "gtk-range";
  // Insensitivity reaches every node, as GTK's state flags do (the theme hides
  // the slider of an insensitive scrollbar).
  const disabledAttr = disabled || undefined;

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      role="scrollbar"
      aria-orientation={orientation}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={value}
      aria-disabled={disabledAttr}
      data-disabled={disabledAttr}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      // The range isn't focusable in a scrollbar: a click keeps the focus where it is.
      {...noFocusOnClick({ onMouseDown, onPointerDown })}
      onWheel={handleWheel}
      {...rest}
    >
      <div className={rangeClasses} data-disabled={disabledAttr}>
        <div
          ref={troughRef}
          className="gtk-trough"
          data-disabled={disabledAttr}
          style={troughStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopScrolling}
          onPointerCancel={stopScrolling}
          onLostPointerCapture={stopScrolling}
        >
          <div
            ref={sliderRef}
            className="gtk-slider"
            data-disabled={disabledAttr}
            style={sliderStyle}
          />
        </div>
      </div>
    </div>
  );
});
