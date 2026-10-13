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

export interface GtkSpinButtonProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Current value. */
  value?: number;
  /** Minimum value. Default: 0. */
  min?: number;
  /** Maximum value. Default: 100. */
  max?: number;
  /** Step increment. Default: 1. */
  step?: number;
  /** Page increment for PageUp/PageDown. Default: 10. */
  pageStep?: number;
  /** Decimal places to display. Default: 0. */
  digits?: number;
  /** Only allow numeric input. Default: false. */
  numeric?: boolean;
  /** Snap to nearest step on blur. Default: false. */
  snapToTicks?: boolean;
  /** Wrap at min/max boundaries. Default: false. */
  wrap?: boolean;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Update policy. Default: "always". */
  updatePolicy?: GtkSpinButtonUpdatePolicy;
  /** Whether Enter activates default widget. Default: false. */
  activatesDefault?: boolean;
  /** Callback on value change. */
  onValueChanged?: (value: number) => void;
}

/**
 * GtkSpinButton — A numeric input with increment/decrement buttons.
 *
 * CSS node:
 *   spinbutton[.horizontal|.vertical]
 *     ├── text
 *     ├── button.down
 *     └── button.up
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
    digits = 0,
    numeric = false,
    snapToTicks = false,
    wrap = false,
    orientation = "horizontal",
    updatePolicy = "always",
    activatesDefault = false,
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

  const DecreaseIcon = useIcon("ValueDecrease");
  const IncreaseIcon = useIcon("ValueIncrease");

  const repeatRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const classes = ["gtk-spinbutton", orientation];
  if (className) classes.push(className);

  const clamp = useCallback(
    (v: number): number => {
      if (wrap) {
        if (v > max) return min + (v - max - step);
        if (v < min) return max - (min - v - step);
      }
      return Math.max(min, Math.min(max, v));
    },
    [min, max, step, wrap],
  );

  const snap = useCallback(
    (v: number): number => {
      if (snapToTicks && step > 0) {
        return Math.round((v - min) / step) * step + min;
      }
      return v;
    },
    [min, step, snapToTicks],
  );

  const setValue = useCallback(
    (v: number) => {
      const clamped = clamp(snap(v));
      if (!isControlled) setInternalValue(clamped);
      onValueChanged?.(clamped);
    },
    [clamp, snap, isControlled, onValueChanged],
  );

  const increment = useCallback((amount: number) => setValue(value + amount), [value, setValue]);

  const startRepeat = useCallback(
    (amount: number) => {
      increment(amount);
      repeatRef.current = setTimeout(() => {
        const repeat = () => {
          increment(amount);
          repeatRef.current = setTimeout(repeat, 50);
        };
        repeat();
      }, 500);
    },
    [increment],
  );

  const stopRepeat = useCallback(() => {
    if (repeatRef.current) clearTimeout(repeatRef.current);
  }, []);

  useEffect(() => () => stopRepeat(), [stopRepeat]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      if (!isNaN(parsed)) {
        if (updatePolicy === "always" || (parsed >= min && parsed <= max)) {
          setValue(parsed);
        }
      }
    },
    [min, max, updatePolicy, setValue],
  );

  const handleInputBlur = useCallback(() => {
    if (snapToTicks) setValue(value);
  }, [value, snapToTicks, setValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        increment(step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        increment(-step);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        increment(pageStep);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        increment(-pageStep);
      } else if (e.key === "Home") {
        e.preventDefault();
        setValue(min);
      } else if (e.key === "End") {
        e.preventDefault();
        setValue(max);
      }
    },
    [step, pageStep, min, max, increment, setValue],
  );

  const canDecrement = wrap || value > min;
  const canIncrement = wrap || value < max;

  return (
    <div
      ref={ref}
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      <input
        className="gtk-text"
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        value={value.toFixed(digits)}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
      />
      <button
        className="gtk-button image-button down"
        type="button"
        tabIndex={-1}
        disabled={!canDecrement}
        onPointerDown={() => startRepeat(-step)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
      >
        <span className="gtk-image">{DecreaseIcon && <DecreaseIcon size={16} />}</span>
      </button>
      <button
        className="gtk-button image-button up"
        type="button"
        tabIndex={-1}
        disabled={!canIncrement}
        onPointerDown={() => startRepeat(step)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
      >
        <span className="gtk-image">{IncreaseIcon && <IncreaseIcon size={16} />}</span>
      </button>
    </div>
  );
});
