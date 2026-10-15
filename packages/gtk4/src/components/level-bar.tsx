import { forwardRef, type HTMLAttributes, useMemo } from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkLevelBarMode,
  type GtkOrientation,
} from "../types.ts";

export interface GtkLevelBarOffset {
  name: string;
  value: number;
}

export interface GtkLevelBarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Current value. Default: 0. */
  value?: number;
  /** Minimum value. Default: 0. */
  minValue?: number;
  /** Maximum value. Default: 1. */
  maxValue?: number;
  /** Rendering mode. Default: "continuous". */
  mode?: GtkLevelBarMode;
  /** Whether to reverse the fill direction. Default: false. */
  inverted?: boolean;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Custom offset thresholds. Default: low=0.25, high=0.75, full=1.0. */
  offsets?: GtkLevelBarOffset[];
}

const DEFAULT_OFFSETS: GtkLevelBarOffset[] = [
  { name: "low", value: 0.25 },
  { name: "high", value: 0.75 },
  { name: "full", value: 1.0 },
];

/**
 * GtkLevelBar — A bar that shows a fill level.
 *
 * CSS node:
 *   levelbar[.horizontal|.vertical][.continuous|.discrete]
 *     └── trough
 *         ├── block.filled[.low|.high|.full|custom]
 *         └── block.empty
 *
 * @see https://docs.gtk.org/gtk4/class.LevelBar.html
 */
export const GtkLevelBar = forwardRef<HTMLDivElement, GtkLevelBarProps>(function GtkLevelBar(
  {
    value = 0,
    minValue = 0,
    maxValue = 1,
    mode = "continuous",
    inverted = false,
    orientation = "horizontal",
    offsets,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const allOffsets = offsets ?? DEFAULT_OFFSETS;

  // Determine which offset level the value falls into
  const offsetClass = useMemo(() => {
    const sorted = [...allOffsets].sort((a, b) => a.value - b.value);
    let result = "";
    for (const offset of sorted) {
      if (value <= offset.value * maxValue || offset === sorted[sorted.length - 1]) {
        result = offset.name;
        break;
      }
    }
    return result;
  }, [value, maxValue, allOffsets]);

  const classes = ["gtk-levelbar", orientation, mode];
  if (className) classes.push(className);

  const range = maxValue - minValue;
  const fraction = range > 0 ? Math.max(0, Math.min(1, (value - minValue) / range)) : 0;

  if (mode === "continuous") {
    const fillPercent = inverted ? (1 - fraction) * 100 : fraction * 100;
    const isHoriz = orientation === "horizontal";

    return (
      <div
        ref={ref}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={minValue}
        aria-valuemax={maxValue}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        <div
          className={`gtk-trough ${fraction <= 0 ? "empty" : ""} ${fraction >= 1 ? "full" : ""}`}
        >
          <div
            className={`gtk-block filled ${offsetClass}`}
            style={isHoriz ? { width: `${fillPercent}%` } : { height: `${fillPercent}%` }}
          />
          <div className="gtk-block empty" />
        </div>
      </div>
    );
  }

  // Discrete mode
  const numBlocks = Math.ceil(range);
  const filledCount = Math.min(numBlocks, Math.round(value - minValue));

  return (
    <div
      ref={ref}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      <div className="gtk-trough">
        {Array.from({ length: numBlocks }, (_, i) => {
          const blockIndex = inverted ? numBlocks - 1 - i : i;
          const isFilled = blockIndex < filledCount;
          return (
            <div key={i} className={`gtk-block ${isFilled ? `filled ${offsetClass}` : "empty"}`} />
          );
        })}
      </div>
    </div>
  );
});
