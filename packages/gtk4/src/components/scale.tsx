import React, { forwardRef, type HTMLAttributes, useCallback, useRef, useState } from "react";
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
  /** Step increment for keyboard. Default: 1. */
  step?: number;
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
  /** Decimal places for the value label. Default: 1. */
  digits?: number;
  /** Scale marks. */
  marks?: GtkScaleMark[];
  /** Callback when value changes. */
  onValueChanged?: (value: number) => void;
}

/**
 * GtkScale — A slider widget for selecting a value from a range.
 *
 * CSS node:
 *   scale[.horizontal|.vertical][.marks-before][.marks-after][.fine-tune]
 *     ├── value[.top|.bottom|.left|.right]
 *     ├── marks.top / marks.bottom
 *     │   └── mark > indicator + [label]
 *     └── trough
 *         ├── highlight
 *         └── slider
 *
 * @see https://docs.gtk.org/gtk4/class.Scale.html
 */
export const GtkScale = forwardRef<HTMLDivElement, GtkScaleProps>(function GtkScale(
  {
    value: controlledValue,
    min = 0,
    max = 100,
    step = 1,
    orientation = "horizontal",
    drawValue = false,
    valuePos = "top",
    hasOrigin = true,
    inverted = false,
    digits = 1,
    marks,
    onValueChanged,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(min);
  const value = isControlled ? controlledValue : internalValue;

  const troughRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [fineTune, setFineTune] = useState(false);

  const fraction = max > min ? (value - min) / (max - min) : 0;
  const displayFraction = inverted ? 1 - fraction : fraction;

  const hasMarksBefore = marks?.some(
    (m) => (m.position ?? "bottom") === "top" || (m.position ?? "bottom") === "left",
  );
  const hasMarksAfter = marks?.some(
    (m) => (m.position ?? "bottom") === "bottom" || (m.position ?? "bottom") === "right",
  );

  const classes = ["gtk-scale", orientation];
  if (hasMarksBefore) classes.push("marks-before");
  if (hasMarksAfter) classes.push("marks-after");
  if (fineTune) classes.push("fine-tune");
  if (className) classes.push(className);

  const clampAndSnap = useCallback(
    (raw: number): number => {
      let v = Math.max(min, Math.min(max, raw));
      // Snap to marks within 12px equivalent
      if (marks) {
        const range = max - min;
        const snapThreshold = range * 0.03; // ~3% of range
        for (const mark of marks) {
          if (Math.abs(v - mark.value) < snapThreshold) {
            v = mark.value;
            break;
          }
        }
      }
      // Round to step
      v = Math.round(v / step) * step;
      return Math.max(min, Math.min(max, v));
    },
    [min, max, step, marks],
  );

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const trough = troughRef.current;
      const slider = sliderRef.current;
      if (!trough || !slider) return;
      const troughRect = trough.getBoundingClientRect();
      const sliderRect = slider.getBoundingClientRect();
      // The slider's visual center determines where the pointer should map.
      // visual_center = CSS_left + margin + size/2
      // At f=0: CSS_left = -margin, so center = size/2
      // At f=1: CSS_left = troughSize - margin - size, so center = troughSize - size/2
      // Span = troughSize - size
      const isHoriz = orientation === "horizontal";
      const sliderSize = isHoriz ? sliderRect.width : sliderRect.height;
      const troughSize = isHoriz ? troughRect.width : troughRect.height;
      const minCenter = sliderSize / 2;
      const maxCenter = troughSize - sliderSize / 2;
      const span = maxCenter - minCenter;
      const pointer = isHoriz ? clientX - troughRect.left : clientY - troughRect.top;
      let frac = span > 0 ? (pointer - minCenter) / span : 0;
      frac = Math.max(0, Math.min(1, frac));
      if (inverted) frac = 1 - frac;
      const raw = min + frac * (max - min);
      const snapped = clampAndSnap(raw);
      if (!isControlled) setInternalValue(snapped);
      onValueChanged?.(snapped);
    },
    [orientation, inverted, min, max, isControlled, clampAndSnap, onValueChanged],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setFineTune(e.shiftKey);
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      setFineTune(e.shiftKey);
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setFineTune(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let newValue = value;
      const inc = e.shiftKey ? step * 0.1 : step;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        newValue = clampAndSnap(value + (inverted ? -inc : inc));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        newValue = clampAndSnap(value - (inverted ? -inc : inc));
      } else if (e.key === "Home") {
        newValue = inverted ? max : min;
      } else if (e.key === "End") {
        newValue = inverted ? min : max;
      } else {
        return;
      }
      e.preventDefault();
      if (!isControlled) setInternalValue(newValue);
      onValueChanged?.(newValue);
    },
    [value, step, min, max, inverted, isControlled, clampAndSnap, onValueChanged],
  );

  const isHoriz = orientation === "horizontal";
  // gtk_range_compute_slider_position(): the slider's margin box starts at
  // this fraction of the trough's length less its own, which layout.css lays
  // out with the slider's actual CSS margins.
  const troughStyle = { "--gtk-scale-slider-position": displayFraction } as React.CSSProperties;
  // gtk_range_allocate_trough(): the highlight is the fraction of the trough,
  // from its far end when inverted.
  const highlightStyle: React.CSSProperties = {
    [isHoriz ? "width" : "height"]: `${fraction * 100}%`,
    ...(inverted && (isHoriz ? { left: "auto", right: 0 } : { top: "auto", bottom: 0 })),
  };

  return (
    <div
      ref={ref}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-orientation={orientation}
      tabIndex={0}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...rest}
    >
      {drawValue && <span className={`gtk-value ${valuePos}`}>{value.toFixed(digits)}</span>}
      <div ref={troughRef} className="gtk-trough" style={troughStyle}>
        {hasOrigin && <div className="gtk-highlight" style={highlightStyle} />}
        <div ref={sliderRef} className="gtk-slider" />
      </div>
      {marks && marks.length > 0 && (
        <div className="gtk-marks">
          {marks.map((mark, i) => (
            <div
              key={i}
              className="gtk-mark"
              style={
                isHoriz
                  ? { left: `${((mark.value - min) / (max - min)) * 100}%` }
                  : { top: `${((mark.value - min) / (max - min)) * 100}%` }
              }
            >
              <div className="gtk-indicator" />
              {mark.label && <span className="gtk-label">{mark.label}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
