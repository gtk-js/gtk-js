import React, { forwardRef, type HTMLAttributes, useCallback, useRef, useState } from "react";
import { alignAttrs, type GtkAlignProps, type GtkOrientation } from "../types.ts";

export interface GtkScrollbarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Scrollbar direction. Default: "vertical". */
  orientation?: GtkOrientation;
  /** Current scroll position (0.0 to 1.0). */
  value?: number;
  /** Size of the visible area relative to total (0.0 to 1.0). */
  pageSize?: number;
  /** Callback when the user drags the slider. */
  onValueChanged?: (value: number) => void;
}

/**
 * GtkScrollbar — A standalone scrollbar widget.
 *
 * CSS node:
 *   scrollbar[.horizontal|.vertical]
 *     └── range
 *         └── trough
 *             └── slider
 *
 * Most apps use GtkScrolledWindow instead. This is for standalone use.
 *
 * @see https://docs.gtk.org/gtk4/class.Scrollbar.html
 */
export const GtkScrollbar = forwardRef<HTMLDivElement, GtkScrollbarProps>(function GtkScrollbar(
  {
    orientation = "vertical",
    value = 0,
    pageSize = 0.2,
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
  const troughRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const classes = ["gtk-scrollbar", "gtk-box-layout", orientation];
  if (className) classes.push(className);

  const isHoriz = orientation === "horizontal";
  const sliderSize = Math.max(0.05, Math.min(1, pageSize));
  const sliderPos = value * (1 - sliderSize);

  const sliderStyle: React.CSSProperties = isHoriz
    ? { left: `${sliderPos * 100}%`, width: `${sliderSize * 100}%` }
    : { top: `${sliderPos * 100}%`, height: `${sliderSize * 100}%` };

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const trough = troughRef.current;
      if (!trough) return;
      const rect = trough.getBoundingClientRect();
      let frac: number;
      if (isHoriz) {
        frac = (clientX - rect.left) / rect.width;
      } else {
        frac = (clientY - rect.top) / rect.height;
      }
      const newValue = Math.max(0, Math.min(1, frac / (1 - sliderSize + 0.001)));
      onValueChanged?.(Math.max(0, Math.min(1, newValue)));
    },
    [isHoriz, sliderSize, onValueChanged],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      updateFromPointer(e.clientX, e.clientY);
    },
    [dragging, updateFromPointer],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      <div className="gtk-range">
        <div
          ref={troughRef}
          className="gtk-trough"
          style={{ position: "relative" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className={`gtk-slider ${dragging ? "dragging" : ""}`}
            style={{ position: "absolute", ...sliderStyle }}
          />
        </div>
      </div>
    </div>
  );
});
