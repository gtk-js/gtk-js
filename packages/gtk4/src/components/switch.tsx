import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { prefersReducedMotion } from "../animation.ts";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkSwitchProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** User-facing toggle state: where the slider is. */
  active?: boolean;
  /**
   * Backend state, shown by the trough color (`:checked`). Allows UI to diverge from
   * backend during async operations. When not provided, follows `active`.
   */
  state?: boolean;
  /** Whether the widget is insensitive (disabled). Default: false. */
  disabled?: boolean;
  /** Callback when the user toggles. Return false to reject the state change. */
  onStateSet?: (newState: boolean) => boolean | void;
}

/** A pointer press on a switch, followed like GtkSwitch's click and pan gestures. */
export interface SwitchPress {
  /** Where the press started. */
  x: number;
  y: number;
  /** Whether the switch is right-to-left. */
  rtl: boolean;
  /** How far the slider moves: half the switch's content width. */
  travel: number;
  /** The switch's `active` when pressed. */
  active: boolean;
  /** The pan gesture, or the slider position once it has claimed the press (0 off, 1 on). */
  pan: "possible" | "denied" | number;
}

/**
 * Moves a press to (x, y). Like GtkGesturePan(HORIZONTAL), it becomes a drag once it goes
 * sideways and is denied if it goes up or down (guess_direction(), gtkgesturepan.c). A drag
 * puts the slider under the pointer (gtk_switch_pan_gesture_pan()).
 */
export function dragSwitch(press: SwitchPress, x: number, y: number): void {
  if (press.pan === "denied") return;
  const dx = press.rtl ? press.x - x : x - press.x;
  const dy = y - press.y;
  if (press.pan === "possible") {
    if (Math.abs(dy) > 2 * Math.abs(dx)) press.pan = "denied";
    if (Math.abs(dx) <= 2 * Math.abs(dy)) return;
  }
  const pos = (dx + (press.active ? press.travel : 0)) / press.travel;
  press.pan = Math.min(Math.max(pos, 0), 1);
}

/** GtkSwitch's ANIMATION_DURATION, in ms. */
const SLIDE_DURATION = 100;

/**
 * GtkSwitch — A toggle switch widget.
 *
 * CSS node:
 *   switch[:checked]
 *     ├── image (on icon)
 *     ├── image (off icon)
 *     └── slider
 *
 * `active` places the slider and `state` sets `:checked`. A click or Space/Enter slides
 * the slider over 100ms (ease-out-cubic) and then changes `active`, like GTK's toggle
 * animation. The slider can also be dragged.
 *
 * @see https://docs.gtk.org/gtk4/class.Switch.html
 */
export const GtkSwitch = forwardRef<HTMLDivElement, GtkSwitchProps>(function GtkSwitch(
  {
    active: controlledActive,
    state: controlledState,
    disabled = false,
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

  // Where the slider is sliding to before `active` changes.
  const [slideTo, setSlideTo] = useState<boolean>();
  const slideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Where the slider is dragged to, from 0 (off) to 1 (on).
  const [dragPos, setDragPos] = useState<number>();
  const press = useRef<SwitchPress | undefined>(undefined);

  // Like gtk_switch_set_active(), a new `active` ends the slide.
  useEffect(() => {
    setSlideTo(undefined);
    return () => clearTimeout(slideTimer.current);
  }, [active]);

  const setActive = useCallback(
    (newActive: boolean) => {
      clearTimeout(slideTimer.current);
      setSlideTo(undefined);
      if (newActive === active) return;
      const rejected = onStateSet?.(newActive) === false;
      if (!rejected && !isControlled) setInternalActive(newActive);
    },
    [active, isControlled, onStateSet],
  );

  // Like gtk_switch_begin_toggle_animation(): `active` changes once the slider gets
  // there, or right away when animations are off.
  const toggle = useCallback(() => {
    if (prefersReducedMotion()) {
      setActive(!active);
      return;
    }
    clearTimeout(slideTimer.current);
    setSlideTo(!active);
    slideTimer.current = setTimeout(() => setActive(!active), SLIDE_DURATION);
  }, [active, setActive]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || e.button !== 0) return;
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const rtl = style.direction === "rtl";
      const x = rtl ? rect.right - e.clientX : e.clientX - rect.left;
      const onSlider = active ? x > rect.width / 2 : x <= rect.width / 2;
      press.current = {
        x: e.clientX,
        y: e.clientY,
        rtl,
        travel:
          (el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) / 2,
        active,
        // Like gtk_switch_click_gesture_pressed(), only a press on the slider can drag it.
        pan: onSlider ? "possible" : "denied",
      };
    },
    [disabled, active],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    dragSwitch(p, e.clientX, e.clientY);
    if (typeof p.pan === "number") setDragPos(p.pan);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = press.current;
      if (!p) return;
      press.current = undefined;
      setDragPos(undefined);
      if (typeof p.pan === "number") {
        // gtk_switch_pan_gesture_drag_end(): on if the slider is past the middle.
        setActive(p.pan >= 0.5);
        return;
      }
      // gtk_switch_click_gesture_released(): a click toggles if released on the switch.
      const rect = e.currentTarget.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        toggle();
      }
    },
    [setActive, toggle],
  );

  // The browser took the press over (e.g. to scroll): drop it, like an unclaimed drag.
  const handlePointerCancel = useCallback(() => {
    press.current = undefined;
    setDragPos(undefined);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Pointer clicks were handled on release. This one comes from assistive
      // technology or element.click().
      if (e.detail === 0 && !disabled) toggle();
      onClick?.(e);
    },
    [disabled, toggle, onClick],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    },
    [disabled, toggle],
  );

  const classes = ["gtk-switch"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      role="switch"
      aria-checked={active}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      // Where the slider is. Not [data-active], which gtk-css matches as :active
      // (pressed).
      data-switch-active={(slideTo ?? active) || undefined}
      data-checked={state || undefined}
      data-disabled={disabled || undefined}
      // GtkSwitch never grabs the focus on click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {/* GTK propagates the insensitive state to the children. */}
      <span className="gtk-image" data-disabled={disabled || undefined} />
      <span className="gtk-image" data-disabled={disabled || undefined} />
      <span
        className="gtk-slider"
        data-disabled={disabled || undefined}
        style={
          dragPos === undefined
            ? undefined
            : { insetInlineStart: `${dragPos * 100}%`, transition: "none" }
        }
      />
    </div>
  );
});
