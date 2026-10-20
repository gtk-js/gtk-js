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
  /** Whether the widget is insensitive (disabled). Default: false. */
  disabled?: boolean;
}

const DEFAULT_OFFSETS: GtkLevelBarOffset[] = [
  { name: "low", value: 0.25 },
  { name: "high", value: 0.75 },
  { name: "full", value: 1.0 },
];

/**
 * The offset whose name the filled blocks get: the first one, in ascending
 * order, that the value doesn't exceed and that the previous one is below;
 * none when the value is above them all (update_level_style_classes()).
 * Offsets outside the range are moved to its ends, like
 * gtk_level_bar_ensure_offsets_in_range().
 */
function levelClass(
  offsets: GtkLevelBarOffset[],
  value: number,
  minValue: number,
  maxValue: number,
): string | undefined {
  const sorted = offsets
    .map((o) => ({ name: o.name, value: Math.min(maxValue, Math.max(minValue, o.value)), o }))
    // Moved offsets that tie go before the ones moved earlier (g_list_insert_sorted()).
    .sort((a, b) => a.value - b.value || b.o.value - a.o.value);
  let prev: number | undefined;
  for (const offset of sorted) {
    if (value <= offset.value && (prev === undefined || prev < value)) return offset.name;
    prev = offset.value;
  }
  return undefined;
}

/**
 * GtkLevelBar — A bar that shows a fill level.
 *
 * CSS node:
 *   levelbar[.horizontal|.vertical][.continuous|.discrete]
 *     └── trough
 *         ├── block.filled[.low|.high|.full|custom]
 *         └── block.empty
 *
 * The trough lays out its blocks (layout.css), like
 * gtk_level_bar_allocate_trough().
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
    disabled = false,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const offsetClass = useMemo(
    () => levelClass(offsets ?? DEFAULT_OFFSETS, value, minValue, maxValue),
    [offsets, value, minValue, maxValue],
  );
  const filledClass = offsetClass ? `gtk-block filled ${offsetClass}` : "gtk-block filled";

  // GtkLevelBar uses GTK_TYPE_BIN_LAYOUT.
  const classes = ["gtk-levelbar", "gtk-bin-layout", orientation, mode];
  if (className) classes.push(className);

  const isHoriz = orientation === "horizontal";
  let blocks: React.ReactNode;

  if (mode === "continuous") {
    const range = maxValue - minValue;
    const fraction = range > 0 ? Math.max(0, Math.min(1, (value - minValue) / range)) : 0;
    // The filled block is drawn over the empty one, from the start, or from the
    // end when inverted (gtk_level_bar_allocate_trough_continuous()).
    const fill = `${fraction * 100}%`;
    const filled = (
      <div
        key="filled"
        className={filledClass}
        style={
          isHoriz
            ? { width: fill, justifySelf: inverted ? "end" : "start" }
            : { height: fill, alignSelf: inverted ? "end" : "start" }
        }
      />
    );
    const empty = <div key="empty" className="gtk-block empty" />;
    // Inverted, the second block node is the filled one.
    blocks = inverted ? [empty, filled] : [filled, empty];
  } else {
    // gtk_level_bar_get_num_blocks(), update_level_style_classes()
    const numBlocks = Math.max(1, Math.round(maxValue) - Math.round(minValue));
    const filledCount = Math.min(numBlocks, Math.round(value) - Math.round(minValue));
    blocks = Array.from({ length: numBlocks }, (_, i) => {
      const blockIndex = inverted ? numBlocks - 1 - i : i;
      return <div key={i} className={blockIndex < filledCount ? filledClass : "gtk-block empty"} />;
    });
  }

  return (
    <div
      ref={ref}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      aria-disabled={disabled || undefined}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-disabled={disabled || undefined}
      {...rest}
    >
      <div className="gtk-trough">{blocks}</div>
    </div>
  );
});
