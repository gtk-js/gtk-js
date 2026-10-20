import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIcon } from "../icon-context.tsx";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkOrientation,
  type GtkSpinButtonUpdatePolicy,
} from "../types.ts";
import {
  clampValue,
  EPSILON,
  filterNumericEdit,
  formatValue,
  parseInput,
  snapValue,
  spinValue,
  widthChars,
} from "./spin-button-logic.ts";

export interface GtkSpinButtonProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Current value. */
  value?: number;
  /** Minimum value. Default: 0. */
  min?: number;
  /** Maximum value. Default: 100. */
  max?: number;
  /** Step increment, for the buttons, Up/Down and the scroll wheel. Default: 1. */
  step?: number;
  /** Page increment, for PageUp/PageDown and middle clicks on the buttons. Default: 10. */
  pageStep?: number;
  /** How much a held button or key speeds up, every 6 steps, up to `pageStep`. Default: 0. */
  climbRate?: number;
  /** Decimal places to display. Default: 0. */
  digits?: number;
  /** Only allow digits, a leading sign and a decimal point to be typed. Default: false. */
  numeric?: boolean;
  /** Round committed values to the nearest step. Default: false. */
  snapToTicks?: boolean;
  /** Spinning past a bound the value is at goes to the other bound. Default: false. */
  wrap?: boolean;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Text alignment, from 0 (start) to 1 (end). Default: 0, or 0.5 when vertical. */
  xalign?: number;
  /** Whether typed values out of range are clamped ("always") or dropped ("if-valid"). Default: "always". */
  updatePolicy?: GtkSpinButtonUpdatePolicy;
  /** Whether Enter on unedited text submits the enclosing form. Default: false. */
  activatesDefault?: boolean;
  /** Whether the scroll wheel spins the value; AdwSpinRow turns it off. Default: true. */
  spinOnScroll?: boolean;
  /** Whether the spin button is insensitive (GtkWidget:sensitive = false). Default: false. */
  disabled?: boolean;
  /** Callback on value change. */
  onValueChanged?: (value: number) => void;
  /** Callback when Enter is pressed on text that wasn't edited (GtkSpinButton::activate). */
  onActivate?: () => void;
  /** Callback when spinning wraps around a bound (GtkSpinButton::wrapped). */
  onWrapped?: () => void;
}

// TIMEOUT_INITIAL, TIMEOUT_REPEAT and MAX_TIMER_CALLS in gtkspinbutton.c.
const TIMEOUT_INITIAL = 500;
const TIMEOUT_REPEAT = 50;
const MAX_TIMER_CALLS = 5;

// The wheel delta, in pixels, of one discrete scroll step.
const WHEEL_NOTCH = 40;

type ChangeKind = "step-up" | "step-down" | "page-up" | "page-down" | "start" | "end";

/**
 * GtkSpinButton — A numeric input with increment/decrement buttons.
 *
 * CSS node:
 *   spinbutton[.horizontal|.vertical]
 *     ├── text
 *     ├── button.down
 *     └── button.up
 *
 * When vertical, button.up comes first, then text and button.down.
 *
 * @see https://docs.gtk.org/gtk4/class.SpinButton.html
 */
export const GtkSpinButton = forwardRef<HTMLDivElement, GtkSpinButtonProps>(function GtkSpinButton(
  {
    value: controlledValue,
    min = 0,
    max = 100,
    step = 1,
    pageStep = 10,
    climbRate = 0,
    digits = 0,
    numeric = false,
    snapToTicks = false,
    wrap = false,
    orientation = "horizontal",
    xalign = orientation === "vertical" ? 0.5 : 0,
    updatePolicy = "always",
    activatesDefault = false,
    spinOnScroll = true,
    disabled = false,
    onValueChanged,
    onActivate,
    onWrapped,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(min);
  // GtkAdjustment keeps its value in [lower, upper].
  const value = clampValue(isControlled ? controlledValue : internalValue, min, max);
  // The text while it's being edited; null shows the value
  // (gtk_spin_button_default_output()).
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? formatValue(value, digits);

  const DecreaseIcon = useIcon("ValueDecrease");
  const IncreaseIcon = useIcon("ValueIncrease");

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // What handlers and timers read: they run between renders, and each spin
  // has to see the value the one before it set.
  const live = useRef({ value, draft });
  live.current.value = value;
  live.current.draft = draft;
  const config = {
    min,
    max,
    step,
    pageStep,
    climbRate,
    digits,
    wrap,
    snapToTicks,
    updatePolicy,
    disabled,
    isControlled,
    onValueChanged,
    onWrapped,
  };
  const props = useRef(config);
  props.current = config;

  const setText = (next: string | null) => {
    live.current.draft = next;
    setDraft(next);
  };

  // gtk_adjustment_set_value(): clamped; a change emits value-changed and
  // outputs the new value as the text.
  const setValue = (next: number) => {
    const p = props.current;
    const clamped = clampValue(next, p.min, p.max);
    if (clamped === live.current.value) return;
    live.current.value = clamped;
    setText(null);
    if (!p.isControlled) setInternalValue(clamped);
    p.onValueChanged?.(clamped);
  };

  // gtk_spin_button_update(): commits the text.
  const update = () => {
    const p = props.current;
    const current = live.current.value;
    const input = parseInput(live.current.draft ?? formatValue(current, p.digits));
    let next = input.value;
    if (p.updatePolicy === "always") {
      next = clampValue(next, p.min, p.max);
    } else if (input.error || next < p.min || next > p.max) {
      setText(null);
      return;
    }
    if (p.snapToTicks) next = snapValue(next, p.min, p.step);
    // gtk_spin_button_set_value()
    if (Math.abs(next - current) > EPSILON) setValue(next);
    setText(null);
  };

  // gtk_spin_button_real_spin()
  const realSpin = (increment: number) => {
    const p = props.current;
    const result = spinValue(live.current.value, increment, p.min, p.max, p.wrap);
    if (Math.abs(result.value - live.current.value) > EPSILON) setValue(result.value);
    if (result.wrapped) p.onWrapped?.();
  };

  // The press-and-hold timer and the climbing step (timer, timer_step,
  // timer_calls, need_timer).
  const timer = useRef({
    id: undefined as ReturnType<typeof setTimeout> | undefined,
    step,
    calls: 0,
    needTimer: false,
    direction: 1,
  });

  const climb = () => {
    const t = timer.current;
    const p = props.current;
    if (p.climbRate > 0 && t.step < p.pageStep) {
      if (t.calls < MAX_TIMER_CALLS) t.calls++;
      else {
        t.calls = 0;
        t.step += p.climbRate;
      }
    }
  };

  // gtk_spin_button_stop_spinning()
  const stopSpinning = useCallback(() => {
    const t = timer.current;
    clearTimeout(t.id);
    t.id = undefined;
    t.needTimer = false;
    t.step = props.current.step;
    t.calls = 0;
  }, []);

  // A held button that turns insensitive at a bound loses its gesture
  // (update_buttons_sensitivity(), button_cancel_cb()).
  const stopAtBound = () => {
    const p = props.current;
    const v = live.current.value;
    const atBound = timer.current.direction > 0 ? p.max - v <= EPSILON : v - p.min <= EPSILON;
    if (!p.wrap && atBound) stopSpinning();
  };

  // gtk_spin_button_timer()
  const tick = () => {
    const t = timer.current;
    if (t.id === undefined) return;
    realSpin(t.direction * t.step);
    if (t.needTimer) {
      t.needTimer = false;
      t.id = setInterval(() => tickRef.current(), TIMEOUT_REPEAT);
    } else {
      climb();
    }
    stopAtBound();
  };
  const tickRef = useRef(tick);
  tickRef.current = tick;

  // start_spinning()
  const startSpinning = (direction: number, amount: number) => {
    const t = timer.current;
    t.direction = direction;
    if (t.id === undefined) {
      t.step = amount;
      t.needTimer = true;
      t.id = setTimeout(() => tickRef.current(), TIMEOUT_INITIAL);
    }
    realSpin(direction * amount);
    stopAtBound();
  };

  // gtk_spin_button_real_change_value(), for the key bindings: commits the
  // text first.
  const changeValue = (kind: ChangeKind) => {
    update();
    const p = props.current;
    const t = timer.current;
    const v = live.current.value;
    switch (kind) {
      case "step-up":
      case "step-down":
        realSpin(kind === "step-up" ? t.step : -t.step);
        climb();
        break;
      case "page-up":
        realSpin(p.pageStep);
        break;
      case "page-down":
        realSpin(-p.pageStep);
        break;
      case "start":
        if (v - p.min > EPSILON) realSpin(p.min - v);
        break;
      case "end":
        if (p.max - v > EPSILON) realSpin(p.max - v);
        break;
    }
    update();
  };

  // A new value or format replaces the text, edited or not
  // (gtk_spin_button_value_changed(), gtk_spin_button_set_digits()).
  useEffect(() => {
    live.current.draft = null;
    setDraft(null);
  }, [value, digits]);

  // The timer step follows the adjustment (adjustment_changed_cb()).
  useEffect(() => {
    timer.current.step = step;
  }, [step]);
  // An insensitive spin button stops spinning (gtk_spin_button_state_flags_changed()).
  useEffect(() => {
    if (disabled) stopSpinning();
  }, [disabled, stopSpinning]);
  useEffect(() => stopSpinning, [stopSpinning]);

  // gtk_spin_button_grab_focus(): focuses the text, which selects it.
  const grabFocus = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  // The scroll controller (scroll_controller_scroll()): each discrete step
  // spins by a step, and takes the focus. React's onWheel is passive, so it
  // couldn't keep the page from scrolling.
  const wheel = useRef({ realSpin, grabFocus, delta: 0 });
  wheel.current.realSpin = realSpin;
  wheel.current.grabFocus = grabFocus;
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !spinOnScroll) return;
    const onWheel = (e: WheelEvent) => {
      if (props.current.disabled || e.deltaY === 0) return;
      e.preventDefault();
      const w = wheel.current;
      w.delta += e.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? e.deltaY : e.deltaY * WHEEL_NOTCH;
      if (Math.abs(w.delta) < WHEEL_NOTCH) return;
      const dy = Math.sign(w.delta);
      w.delta = 0;
      if (document.activeElement !== inputRef.current) w.grabFocus();
      w.realSpin(-dy * props.current.step);
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [spinOnScroll]);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const canDown = !disabled && (wrap || value - min > EPSILON);
  const canUp = !disabled && (wrap || max - value > EPSILON);

  // button_pressed_cb() / button_released_cb(): commits the text, then the
  // primary button spins by a step and the middle one by a page, repeating
  // while held; the secondary one goes to the bound when released.
  const pressButton = (e: React.PointerEvent<HTMLButtonElement>, direction: number) => {
    if (!(direction > 0 ? canUp : canDown)) return;
    const pressed = e.button;
    grabFocus();
    update();
    if (pressed === 0) startSpinning(direction, props.current.step);
    else if (pressed === 1) startSpinning(direction, props.current.pageStep);
    const release = (up: PointerEvent) => {
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
      stopSpinning();
      if (up.type !== "pointerup" || pressed !== 2) return;
      const p = props.current;
      const v = live.current.value;
      const diff = direction > 0 ? p.max - v : v - p.min;
      if (diff > EPSILON) realSpin(direction * diff);
    };
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
  };

  // GtkText's changed only marks the text edited (gtk_spin_button_changed());
  // a numeric one filters what's inserted (gtk_spin_button_insert_text()).
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (!numeric) {
      setText(input.value);
      return;
    }
    const edit = filterNumericEdit(text, input.value, digits);
    if (edit.text !== input.value) {
      input.value = edit.text;
      input.setSelectionRange(edit.caret, edit.caret);
    }
    if (edit.text !== text) setText(edit.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const modified = e.ctrlKey || e.altKey || e.metaKey || e.shiftKey;
    const ctrlOnly = e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;
    let kind: ChangeKind | undefined;
    if (!modified) {
      if (e.key === "ArrowUp") kind = "step-up";
      else if (e.key === "ArrowDown") kind = "step-down";
      else if (e.key === "PageUp") kind = "page-up";
      else if (e.key === "PageDown") kind = "page-down";
      else if (e.key === "Enter") {
        // gtk_spin_button_activate(): commits the text, and emits activate
        // (which activates the default) only if it wasn't edited.
        const edited = live.current.draft !== null;
        update();
        if (!edited) onActivate?.();
        if (edited || !activatesDefault) e.preventDefault();
      }
    } else if (ctrlOnly) {
      if (e.key === "Home" || e.key === "PageDown") kind = "start";
      else if (e.key === "End" || e.key === "PageUp") kind = "end";
    }
    if (kind) {
      e.preventDefault();
      changeValue(kind);
    }
  };

  const classes = ["gtk-spinbutton", "gtk-box-layout", orientation];
  if (className) classes.push(className);

  const button = (direction: 1 | -1) => {
    const Icon = direction > 0 ? IncreaseIcon : DecreaseIcon;
    return (
      <button
        className={`gtk-button image-button ${direction > 0 ? "up" : "down"}`}
        type="button"
        // Neither focusable nor accessible: the spin button is the one widget
        // (gtk_spin_button_init()).
        tabIndex={-1}
        aria-hidden
        disabled={direction > 0 ? !canUp : !canDown}
        onMouseDown={(e) => e.preventDefault()}
        // No middle-click paste into the text.
        onMouseUp={(e) => e.preventDefault()}
        onPointerDown={(e) => pressButton(e, direction)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="gtk-image">{Icon && <Icon size={16} />}</span>
      </button>
    );
  };

  const charsWidth = `calc(${widthChars(min, max, digits)} * round(up, 1ch, 1px))`;
  const input = (
    <input
      ref={inputRef}
      className="gtk-text"
      type="text"
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      inputMode={numeric ? (digits > 0 ? "decimal" : "numeric") : "text"}
      disabled={disabled}
      value={text}
      // The text expands (gtk_spin_button_init()), from width-chars
      // characters (gtk_spin_button_update_width_chars(), gtk_text_measure()),
      // and fills the width of a vertical spin button: an explicit width
      // doesn't stretch.
      data-hexpand="true"
      data-vexpand="true"
      style={{
        width: charsWidth,
        minWidth: orientation === "vertical" ? "100%" : undefined,
        textAlign: xalign <= 0 ? "start" : xalign >= 1 ? "end" : "center",
      }}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      // key_controller_key_released(): the climb starts over.
      onKeyUp={() => {
        timer.current.step = props.current.step;
        timer.current.calls = 0;
      }}
      // key_controller_focus_out()
      onBlur={() => {
        if (!disabled) update();
      }}
    />
  );

  return (
    <div
      ref={setRef}
      className={classes.join(" ")}
      data-disabled={disabled || undefined}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      {orientation === "vertical" ? (
        <>
          {button(1)}
          {input}
          {button(-1)}
        </>
      ) : (
        <>
          {input}
          {button(-1)}
          {button(1)}
        </>
      )}
    </div>
  );
});
