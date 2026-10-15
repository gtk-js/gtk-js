import React, { forwardRef, type HTMLAttributes, useCallback, useRef, useState } from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkSwitchProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** User-facing toggle state. */
  active?: boolean;
  /**
   * Backend state. Allows UI to diverge from backend during async operations.
   * When not provided, follows `active`.
   */
  state?: boolean;
  /** Callback when the user toggles. Return false to reject the state change. */
  onStateSet?: (newState: boolean) => boolean | void;
}

/**
 * GtkSwitch — A toggle switch widget.
 *
 * CSS node:
 *   switch[:checked]
 *     ├── image (on icon)
 *     ├── image (off icon)
 *     └── slider
 *
 * Animation: 100ms ease-out-cubic slider transition via CSS.
 *
 * @see https://docs.gtk.org/gtk4/class.Switch.html
 */
export const GtkSwitch = forwardRef<HTMLDivElement, GtkSwitchProps>(function GtkSwitch(
  {
    active: controlledActive,
    state: controlledState,
    onStateSet,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    onClick,
    ...rest
  },
  ref,
) {
  const isControlled = controlledActive !== undefined;
  const [internalActive, setInternalActive] = useState(false);
  const active = isControlled ? controlledActive : internalActive;
  const state = controlledState ?? active;

  // Drag state
  const switchRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartActive = useRef(false);

  const toggle = useCallback(() => {
    const newState = !active;
    const rejected = onStateSet?.(newState) === false;
    if (!rejected && !isControlled) {
      setInternalActive(newState);
    }
  }, [active, isControlled, onStateSet]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragging) toggle();
      onClick?.(e);
    },
    [dragging, toggle, onClick],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragStartX.current = e.clientX;
      dragStartActive.current = active;
      setDragging(false);
    },
    [active],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 6) setDragging(true);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      if (dragging) {
        const dx = e.clientX - dragStartX.current;
        const shouldBeActive = dx > 0 ? true : dx < 0 ? false : dragStartActive.current;
        if (shouldBeActive !== active) toggle();
      }
      setDragging(false);
    },
    [dragging, active, toggle],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    },
    [toggle],
  );

  const classes = ["gtk-switch"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref ?? switchRef}
      role="switch"
      aria-checked={state}
      tabIndex={0}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-checked={state || undefined}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <span className="gtk-image" />
      <span className="gtk-image" />
      <span className="gtk-slider" />
    </div>
  );
});
