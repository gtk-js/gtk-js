import { useIcon, useListBoxRow } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, useCallback, useState } from "react";

export interface AdwSpinRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  digits?: number;
  numeric?: boolean;
  wrap?: boolean;
  onValueChanged?: (value: number) => void;
}

/**
 * AdwSpinRow — An ActionRow with an integrated spin button.
 *
 * CSS node: row.spin
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.SpinRow.html
 */
export const AdwSpinRow = forwardRef<HTMLDivElement, AdwSpinRowProps>(function AdwSpinRow(
  {
    title,
    subtitle,
    value: controlledValue,
    min = 0,
    max = 100,
    step = 1,
    digits = 0,
    numeric = false,
    wrap = false,
    onValueChanged,
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

  const clamp = useCallback(
    (v: number) => {
      if (wrap) {
        if (v > max) return min;
        if (v < min) return max;
      }
      return Math.max(min, Math.min(max, v));
    },
    [min, max, wrap],
  );

  const setValue = useCallback(
    (v: number) => {
      const clamped = clamp(v);
      if (!isControlled) setInternalValue(clamped);
      onValueChanged?.(clamped);
    },
    [clamp, isControlled, onValueChanged],
  );

  useListBoxRow();
  const classes = ["gtk-row", "spin"];
  if (className) classes.push(className);

  return (
    <div ref={ref} className={classes.join(" ")} {...rest}>
      <div className="gtk-box gtk-box-layout horizontal header" style={{ alignItems: "center" }}>
        <div className="gtk-box gtk-box-layout vertical title" style={{ flex: 1 }}>
          <span className="gtk-label title">{title}</span>
          {subtitle && <span className="gtk-label subtitle">{subtitle}</span>}
        </div>
        <div className="gtk-spinbutton horizontal" style={{ gap: 6 }}>
          <input
            className="gtk-text"
            type="text"
            inputMode={numeric ? "numeric" : "text"}
            value={value.toFixed(digits)}
            style={{ textAlign: "right" }}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed)) setValue(parsed);
            }}
          />
          <button
            type="button"
            className="gtk-button image-button down circular"
            onClick={() => setValue(value - step)}
            disabled={!wrap && value <= min}
          >
            <span className="gtk-image">{DecreaseIcon && <DecreaseIcon size={16} />}</span>
          </button>
          <button
            type="button"
            className="gtk-button image-button up circular"
            onClick={() => setValue(value + step)}
            disabled={!wrap && value >= max}
          >
            <span className="gtk-image">{IncreaseIcon && <IncreaseIcon size={16} />}</span>
          </button>
        </div>
      </div>
    </div>
  );
});
