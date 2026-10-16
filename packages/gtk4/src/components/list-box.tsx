import React, {
  Children,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { GtkListBoxRowContext, useListBoxRow } from "../list-box-row-context.tsx";
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
  {
    activatable = true,
    selectable = true,
    children,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const placeRow = useListBoxRow();
  const classes = ["gtk-row", "gtk-bin-layout"];
  if (activatable) classes.push("activatable");
  if (className) classes.push(className);

  // Rows can take focus (GtkListBoxRow is focusable), one Tab stop each, like
  // GTK_LIST_TAB_ALL.
  return placeRow(
    <div
      ref={ref}
      role="listitem"
      tabIndex={0}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-selectable={selectable || undefined}
      {...rest}
    >
      {children}
    </div>,
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
  /**
   * Controlled selection: indices of the selected rows. When set, the list
   * shows exactly these rows as selected and only reports changes.
   */
  selectedRows?: number[];
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
    selectedRows,
    children,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const [internalSelected, setSelectedIndices] = useState<Set<number>>(new Set());
  // Rows with selectable={false} can't be selected (gtk_list_box_select_row()
  // ignores them).
  const unselectable = new Set<number>();
  Children.forEach(children, (child, index) => {
    if (React.isValidElement<GtkListBoxRowProps>(child) && child.props.selectable === false) {
      unselectable.add(index);
    }
  });
  // Like gtk_list_box_select_row(): nothing is selected in "none" mode, and
  // selecting a row in "single"/"browse" mode unselects the others.
  const selectableRows = selectedRows?.filter((index) => !unselectable.has(index));
  const controlledSelection =
    selectableRows === undefined
      ? undefined
      : selectionMode === "none"
        ? []
        : selectionMode === "multiple"
          ? selectableRows
          : selectableRows.slice(-1);
  // A selected row that stops being selectable is unselected
  // (gtk_list_box_row_set_selectable()).
  const stillSelectable = [...internalSelected].filter((index) => !unselectable.has(index));
  if (!selectedRows && stillSelectable.length !== internalSelected.size) {
    setSelectedIndices(new Set(stillSelectable));
  }
  const selectedIndices = controlledSelection
    ? new Set(controlledSelection)
    : new Set(stillSelectable);

  const classes = ["gtk-list"];
  if (showSeparators) classes.push("separators");
  if (className) classes.push(className);

  const childCount = Children.count(children);

  const selectRow = useCallback(
    (index: number) => {
      if (selectionMode === "none" || unselectable.has(index)) return;
      const next = new Set(selectedIndices);
      if (selectionMode === "multiple") {
        if (next.has(index)) next.delete(index);
        else next.add(index);
      } else {
        next.clear();
        next.add(index);
      }
      if (!selectedRows) setSelectedIndices(next);
      onSelectedRowsChanged?.([...next]);
    },
    [selectionMode, onSelectedRowsChanged, selectedRows, selectedIndices, unselectable],
  );

  const handleRowClick = useCallback(
    (index: number) => {
      selectRow(index);
      if (activateOnSingleClick) onRowActivated?.(index);
    },
    [selectRow, activateOnSingleClick, onRowActivated],
  );

  // Keyboard navigation on a focused row (gtk_list_box_move_cursor()): the
  // arrows, Home and End move to another row and select it, unless Ctrl is
  // held. Enter and Space activate it (gtk_list_box_activate_cursor_row()).
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const rows = Array.from(e.currentTarget.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains("gtk-row"),
      );
      const index = rows.indexOf(e.target as HTMLElement);
      if (index < 0) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectRow(index);
        onRowActivated?.(index);
        return;
      }
      const target =
        e.key === "ArrowUp"
          ? index - 1
          : e.key === "ArrowDown"
            ? index + 1
            : e.key === "Home"
              ? 0
              : e.key === "End"
                ? rows.length - 1
                : null;
      if (target === null) return;
      e.preventDefault();
      const row = rows[target];
      if (!row) return;
      row.focus();
      if (!e.ctrlKey) selectRow(target);
    },
    [onKeyDown, selectRow, onRowActivated],
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
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {/* Its rows are its own, not an enclosing preferences group's. */}
      <GtkListBoxRowContext.Provider value={null}>
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
      </GtkListBoxRowContext.Provider>
    </div>
  );
});
