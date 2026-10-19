import React, {
  Children,
  type CSSProperties,
  createElement,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

type Axis = "column" | "row";

/**
 * Which lines expand, like grid_request_compute_expand(): those with an
 * expanding child that spans one line, and all lines of an expanding child
 * that spans several when none of them expands yet. Placement comes from the
 * children's inline grid-column / grid-row, expand from expand.ts.
 */
function lineExpand(grid: HTMLElement, axis: Axis, count: number): boolean[] {
  const attr = axis === "column" ? "data-computed-hexpand" : "data-computed-vexpand";
  const expand = new Array<boolean>(count).fill(false);
  const spanning: [number, number][] = [];
  for (const child of grid.children) {
    if (!(child instanceof HTMLElement) || child.hidden || !child.hasAttribute(attr)) continue;
    const pos = Number.parseInt(child.style.getPropertyValue(`grid-${axis}-start`), 10) - 1;
    const span = Number.parseInt(
      child.style.getPropertyValue(`grid-${axis}-end`).replace("span", ""),
      10,
    );
    if (Number.isNaN(pos) || Number.isNaN(span)) continue;
    if (span === 1) expand[pos] = true;
    else spanning.push([pos, span]);
  }
  const result = expand.slice(0, count);
  for (const [pos, span] of spanning) {
    if (!expand.slice(pos, pos + span).includes(true)) result.fill(true, pos, pos + span);
  }
  return result;
}

/**
 * Only expanding lines take the extra space (grid_distribute_non_homogeneous()):
 * CSS stretches `auto` tracks, not max-content ones. Homogeneous lines share
 * all of it equally.
 */
function lineTemplate(count: number, homogeneous: boolean, expand: boolean[]) {
  if (count === 0) return undefined;
  if (homogeneous) return `repeat(${count}, 1fr)`;
  return Array.from({ length: count }, (_, i) =>
    expand[i] ? "auto" : "minmax(auto, max-content)",
  ).join(" ");
}

const sameLines = (a: boolean[], b: boolean[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * GtkGrid — A container that arranges children in rows and columns.
 *
 * CSS node: grid
 *
 * Children take `column`, `row`, `columnSpan` and `rowSpan` props
 * (GtkGridChildProps) for placement, like gtk_grid_attach(). Without them,
 * children flow naturally.
 *
 * Uses CSS Grid for GtkGridLayout.
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
  const gridRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => gridRef.current as HTMLDivElement);

  const classes = ["gtk-grid", "gtk-grid-layout"];
  if (className) classes.push(className);

  // Lines run from the first one used to the last (grid_request_count_lines()).
  let minCol = Number.POSITIVE_INFINITY;
  let minRow = Number.POSITIVE_INFINITY;
  let maxCol = 0;
  let maxRow = 0;
  Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as GtkGridChildProps;
    if (props.column !== undefined) {
      minCol = Math.min(minCol, props.column);
      maxCol = Math.max(maxCol, props.column + (props.columnSpan ?? 1));
    }
    if (props.row !== undefined) {
      minRow = Math.min(minRow, props.row);
      maxRow = Math.max(maxRow, props.row + (props.rowSpan ?? 1));
    }
  });
  const columns = Number.isFinite(minCol) ? maxCol - minCol : 0;
  const rows = Number.isFinite(minRow) ? maxRow - minRow : 0;

  // Lines that expand, from the children's computed expand (gtk_widget_compute_expand()).
  const [expand, setExpand] = useState({ columns: [] as boolean[], rows: [] as boolean[] });
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => {
      const next = {
        columns: lineExpand(grid, "column", columns),
        rows: lineExpand(grid, "row", rows),
      };
      setExpand((prev) =>
        sameLines(prev.columns, next.columns) && sameLines(prev.rows, next.rows) ? prev : next,
      );
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(grid, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-computed-hexpand", "data-computed-vexpand"],
    });
    return () => observer.disconnect();
  });

  const gridStyle: CSSProperties = {
    rowGap: rowSpacing > 0 ? rowSpacing : undefined,
    columnGap: columnSpacing > 0 ? columnSpacing : undefined,
    gridTemplateColumns: lineTemplate(columns, columnHomogeneous, expand.columns),
    gridTemplateRows: lineTemplate(rows, rowHomogeneous, expand.rows),
    ...style,
  };

  return (
    <div
      ref={gridRef}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={gridStyle}
      {...rest}
    >
      {Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        const { column, row, columnSpan, rowSpan, ...props } = child.props as GtkGridChildProps &
          Record<string, unknown> & { style?: CSSProperties };
        if (
          column === undefined &&
          row === undefined &&
          columnSpan === undefined &&
          rowSpan === undefined
        ) {
          return child;
        }
        // React 18 keeps the ref on the element, React 19 in its props.
        if (!("ref" in props)) props.ref = (child as { ref?: unknown }).ref;
        // The child is the grid item, so it gets its cells' whole area and
        // aligns in it by its halign/valign, like gtk_grid_layout_allocate().
        return createElement(child.type, {
          ...props,
          key: child.key,
          style: {
            ...props.style,
            gridColumn:
              column !== undefined ? `${column - minCol + 1} / span ${columnSpan ?? 1}` : undefined,
            gridRow: row !== undefined ? `${row - minRow + 1} / span ${rowSpan ?? 1}` : undefined,
          },
        });
      })}
    </div>
  );
});
