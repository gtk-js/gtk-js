import React, {
  Children,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { useListBoxRow } from "../list-box-row-context.ts";
import { alignAttrs, type GtkAlignProps, type GtkSelectionMode } from "../types.ts";

export interface GtkListBoxRowProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether the row can be activated (click/keyboard). Default: true. */
  activatable?: boolean;
  /** Whether the row can be selected. Default: true. */
  selectable?: boolean;
  children?: ReactNode;
}

/**
 * GtkListBoxRow — A single row in a GtkListBox.
 *
 * CSS node: row[.activatable]
 *
 * @see https://docs.gtk.org/gtk4/class.ListBoxRow.html
 */
export const GtkListBoxRow = forwardRef<HTMLDivElement, GtkListBoxRowProps>(function GtkListBoxRow(
  { activatable = true, selectable = true, children, halign, valign, className, ...rest },
  ref,
) {
  useListBoxRow();
  const classes = ["gtk-row", "gtk-bin-layout"];
  if (activatable) classes.push("activatable");
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      role="listitem"
      className={classes.join(" ")}
      {...alignAttrs(halign, valign)}
      data-selectable={selectable || undefined}
      {...rest}
    >
      {children}
    </div>
  );
});

export interface GtkListBoxProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Selection behavior. Default: "single". */
  selectionMode?: GtkSelectionMode;
  /** Activate on single click instead of double. Default: true. */
  activateOnSingleClick?: boolean;
  /** Show separators between rows. Default: false. */
  showSeparators?: boolean;
  /** Placeholder shown when no rows are visible. */
  placeholder?: ReactNode;
  /** Callback when a row is activated. */
  onRowActivated?: (index: number) => void;
  /** Callback when selection changes. */
  onSelectedRowsChanged?: (indices: number[]) => void;
  children?: ReactNode;
}

/**
 * GtkListBox — A vertical list of rows.
 *
 * CSS node: list[.separators][.boxed-list][.navigation-sidebar][.rich-list]
 *
 * @see https://docs.gtk.org/gtk4/class.ListBox.html
 */
export const GtkListBox = forwardRef<HTMLDivElement, GtkListBoxProps>(function GtkListBox(
  {
    selectionMode = "single",
    activateOnSingleClick = true,
    showSeparators = false,
    placeholder,
    onRowActivated,
    onSelectedRowsChanged,
    children,
    halign,
    valign,
    className,
    ...rest
  },
  ref,
) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const classes = ["gtk-list"];
  if (showSeparators) classes.push("separators");
  if (className) classes.push(className);

  const childCount = Children.count(children);

  const handleRowClick = useCallback(
    (index: number) => {
      if (selectionMode === "none") {
        if (activateOnSingleClick) onRowActivated?.(index);
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
        onSelectedRowsChanged?.([...next]);
        return next;
      });

      if (activateOnSingleClick) onRowActivated?.(index);
    },
    [selectionMode, activateOnSingleClick, onRowActivated, onSelectedRowsChanged],
  );

  const handleRowDoubleClick = useCallback(
    (index: number) => {
      if (!activateOnSingleClick) onRowActivated?.(index);
    },
    [activateOnSingleClick, onRowActivated],
  );

  return (
    <div
      ref={ref}
      role="list"
      className={classes.join(" ")}
      {...alignAttrs(halign, valign)}
      {...rest}
    >
      {childCount === 0 && placeholder ? (
        <div className="gtk-placeholder">{placeholder}</div>
      ) : (
        Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;
          const isSelected = selectedIndices.has(index);

          return React.cloneElement(
            child as React.ReactElement<GtkListBoxRowProps & Record<string, unknown>>,
            {
              "aria-selected": isSelected,
              "data-checked": isSelected || undefined,
              onClick: (e: React.MouseEvent) => {
                handleRowClick(index);
                (child.props as Record<string, (e: React.MouseEvent) => void>).onClick?.(e);
              },
              onDoubleClick: (e: React.MouseEvent) => {
                handleRowDoubleClick(index);
                (child.props as Record<string, (e: React.MouseEvent) => void>).onDoubleClick?.(e);
              },
            } as Partial<GtkListBoxRowProps>,
          );
        })
      )}
    </div>
  );
});
