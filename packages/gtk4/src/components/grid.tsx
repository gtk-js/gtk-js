import React, { Children, forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkGridChildProps {
  /** Starting column (0-based). */
  column?: number;
  /** Starting row (0-based). */
  row?: number;
  /** Number of columns to span. Default: 1. */
  columnSpan?: number;
  /** Number of rows to span. Default: 1. */
  rowSpan?: number;
}

export interface GtkGridProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Spacing between rows in pixels. Default: 0. */
  rowSpacing?: number;
  /** Spacing between columns in pixels. Default: 0. */
  columnSpacing?: number;
  /** All rows get equal height. Default: false. */
  rowHomogeneous?: boolean;
  /** All columns get equal width. Default: false. */
  columnHomogeneous?: boolean;
  children?: ReactNode;
}

/**
 * GtkGrid — A container that arranges children in rows and columns.
 *
 * CSS node: grid
 *
 * Children should have `column`, `row`, `columnSpan`, `rowSpan` props
 * for explicit placement. Without them, children flow naturally.
 *
 * Uses CSS Grid for layout.
 *
 * @see https://docs.gtk.org/gtk4/class.Grid.html
 */
export const GtkGrid = forwardRef<HTMLDivElement, GtkGridProps>(function GtkGrid(
  {
    rowSpacing = 0,
    columnSpacing = 0,
    rowHomogeneous = false,
    columnHomogeneous = false,
    children,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-grid"];
  if (className) classes.push(className);

  // Determine grid dimensions from children props
  let maxCol = 0;
  let maxRow = 0;
  Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as GtkGridChildProps;
    const col = (props.column ?? 0) + (props.columnSpan ?? 1);
    const row = (props.row ?? 0) + (props.rowSpan ?? 1);
    if (col > maxCol) maxCol = col;
    if (row > maxRow) maxRow = row;
  });

  const gridStyle: React.CSSProperties = {
    display: "grid",
    rowGap: rowSpacing > 0 ? rowSpacing : undefined,
    columnGap: columnSpacing > 0 ? columnSpacing : undefined,
    gridTemplateColumns: columnHomogeneous && maxCol > 0 ? `repeat(${maxCol}, 1fr)` : undefined,
    gridTemplateRows: rowHomogeneous && maxRow > 0 ? `repeat(${maxRow}, 1fr)` : undefined,
    ...style,
  };

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={gridStyle}
      {...rest}
    >
      {Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        const props = child.props as GtkGridChildProps;
        const col = props.column;
        const row = props.row;
        const colSpan = props.columnSpan;
        const rowSpan = props.rowSpan;

        const hasPlacement =
          col !== undefined || row !== undefined || colSpan !== undefined || rowSpan !== undefined;

        if (!hasPlacement) return child;

        const cellStyle: React.CSSProperties = {
          gridColumn: col !== undefined ? `${col + 1} / span ${colSpan ?? 1}` : undefined,
          gridRow: row !== undefined ? `${row + 1} / span ${rowSpan ?? 1}` : undefined,
        };

        return <div style={cellStyle}>{child}</div>;
      })}
    </div>
  );
});
