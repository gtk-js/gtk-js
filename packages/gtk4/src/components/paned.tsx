import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps, type GtkOrientation } from "../types.ts";

export interface GtkPanedProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Separator position in pixels from start. */
  position?: number;
  /** Whether a wide (thick) handle is shown. Default: false. */
  wideHandle?: boolean;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Start child resizes with pane. Default: true. */
  resizeStartChild?: boolean;
  /** End child resizes with pane. Default: true. */
  resizeEndChild?: boolean;
  /** Start child can be smaller than its minimum. Default: true. */
  shrinkStartChild?: boolean;
  /** End child can be smaller than its minimum. Default: true. */
  shrinkEndChild?: boolean;
  /** First child (left/top). */
  startChild?: ReactNode;
  /** Second child (right/bottom). */
  endChild?: ReactNode;
  /** Callback when separator position changes. */
  onPositionChanged?: (position: number) => void;
}

/**
 * GtkPaned — A container with two children separated by a draggable handle.
 *
 * CSS node:
 *   paned[.horizontal|.vertical]
 *     ├── <start-child>
 *     ├── separator[.wide]
 *     └── <end-child>
 *
 * @see https://docs.gtk.org/gtk4/class.Paned.html
 */
export const GtkPaned = forwardRef<HTMLDivElement, GtkPanedProps>(function GtkPaned(
  {
    position: controlledPosition,
    wideHandle = false,
    orientation = "horizontal",
    resizeStartChild = true,
    resizeEndChild = true,
    shrinkStartChild = true,
    shrinkEndChild = true,
    startChild,
    endChild,
    onPositionChanged,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isControlled = controlledPosition !== undefined;
  const [internalPosition, setInternalPosition] = useState(200);
  const position = isControlled ? controlledPosition : internalPosition;
  const [dragging, setDragging] = useState(false);

  const isHoriz = orientation === "horizontal";

  const classes = ["gtk-paned", orientation];
  if (className) classes.push(className);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let pos: number;
      if (isHoriz) {
        pos = e.clientX - rect.left;
      } else {
        pos = e.clientY - rect.top;
      }
      pos = Math.max(0, pos);
      if (!isControlled) setInternalPosition(pos);
      onPositionChanged?.(pos);
    },
    [dragging, isHoriz, isControlled, onPositionChanged],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
  }, []);

  const separatorClasses = ["gtk-separator", orientation];
  if (wideHandle) separatorClasses.push("wide");

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isHoriz ? "row" : "column",
    ...style,
  };

  const startStyle: React.CSSProperties = {
    flexBasis: position,
    flexGrow: resizeStartChild ? 1 : 0,
    flexShrink: shrinkStartChild ? 1 : 0,
    overflow: "hidden",
  };

  const endStyle: React.CSSProperties = {
    flex: 1,
    flexGrow: resizeEndChild ? 1 : 0,
    flexShrink: shrinkEndChild ? 1 : 0,
    overflow: "hidden",
  };

  return (
    <div
      ref={ref ?? containerRef}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={containerStyle}
      {...rest}
    >
      <div style={startStyle}>{startChild}</div>
      <div
        className={separatorClasses.join(" ")}
        role="separator"
        aria-orientation={orientation}
        tabIndex={0}
        style={{ cursor: isHoriz ? "col-resize" : "row-resize" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div style={endStyle}>{endChild}</div>
    </div>
  );
});
