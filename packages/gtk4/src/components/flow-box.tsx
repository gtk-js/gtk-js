import React, {
  Children,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkOrientation,
  type GtkSelectionMode,
} from "../types.ts";

export interface GtkFlowBoxChildProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  children?: ReactNode;
}

/**
 * GtkFlowBoxChild — A single child in a GtkFlowBox.
 *
 * CSS node: flowboxchild
 *
 * @see https://docs.gtk.org/gtk4/class.FlowBoxChild.html
 */
export const GtkFlowBoxChild = forwardRef<HTMLDivElement, GtkFlowBoxChildProps>(
  function GtkFlowBoxChild(
    { children, halign, valign, hexpand, vexpand, className, ...rest },
    ref,
  ) {
    const classes = ["gtk-flowboxchild", "gtk-bin-layout"];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        role="gridcell"
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export interface GtkFlowBoxProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** All children get equal size. Default: false. */
  homogeneous?: boolean;
  /** Spacing between columns. Default: 0. */
  columnSpacing?: number;
  /** Spacing between rows. Default: 0. */
  rowSpacing?: number;
  /** Minimum children per line. Default: 0 (auto). */
  minChildrenPerLine?: number;
  /** Maximum children per line. Default: 7. */
  maxChildrenPerLine?: number;
  /** Selection behavior. Default: "single". */
  selectionMode?: GtkSelectionMode;
  /** Activate on single click. Default: true. */
  activateOnSingleClick?: boolean;
  /** Flow direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Callback on child activation. */
  onChildActivated?: (index: number) => void;
  children?: ReactNode;
}

/**
 * GtkFlowBox — A reflowing grid of children.
 *
 * CSS node: flowbox
 *
 * Uses CSS flexbox with wrap for the reflowing layout.
 *
 * @see https://docs.gtk.org/gtk4/class.FlowBox.html
 */
export const GtkFlowBox = forwardRef<HTMLDivElement, GtkFlowBoxProps>(function GtkFlowBox(
  {
    homogeneous = false,
    columnSpacing = 0,
    rowSpacing = 0,
    minChildrenPerLine = 0,
    maxChildrenPerLine = 7,
    selectionMode = "single",
    activateOnSingleClick = true,
    orientation = "horizontal",
    onChildActivated,
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
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const classes = ["gtk-flowbox"];
  if (className) classes.push(className);

  const isHoriz = orientation === "horizontal";
  const flowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: isHoriz ? "row" : "column",
    rowGap: rowSpacing > 0 ? rowSpacing : undefined,
    columnGap: columnSpacing > 0 ? columnSpacing : undefined,
    ...style,
  };

  // Child width calculation for min/max children per line
  const _childCount = Children.count(children);
  const childFlexBasis = maxChildrenPerLine > 0 ? `${100 / maxChildrenPerLine}%` : undefined;

  const handleClick = useCallback(
    (index: number) => {
      if (selectionMode === "none") {
        if (activateOnSingleClick) onChildActivated?.(index);
        return;
      }
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (selectionMode === "multiple") {
          if (next.has(index)) next.delete(index);
          else next.add(index);
        } else {
          next.clear();
          next.add(index);
        }
        return next;
      });
      if (activateOnSingleClick) onChildActivated?.(index);
    },
    [selectionMode, activateOnSingleClick, onChildActivated],
  );

  return (
    <div
      ref={ref}
      role="grid"
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={flowStyle}
      {...rest}
    >
      {Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        const isSelected = selectedIndices.has(index);

        const childStyle: React.CSSProperties = {
          flexBasis: homogeneous ? childFlexBasis : undefined,
          flexGrow: homogeneous ? 1 : undefined,
        };

        return (
          <div
            style={childStyle}
            aria-selected={isSelected}
            data-checked={isSelected || undefined}
            onClick={() => handleClick(index)}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
});
