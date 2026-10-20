import React, {
  Children,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  GtkListBoxRowContext,
  GtkListBoxSlotContext,
  useListBoxRow,
} from "../list-box-row-context.tsx";
import { tooltipAttrs } from "../tooltip.tsx";
import { alignAttrs, type GtkAlignProps, type GtkSelectionMode } from "../types.ts";

export interface GtkListBoxRowProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether the row can be activated (click/keyboard). Default: true. */
  activatable?: boolean;
  /** Whether the row can be selected. Default: true. */
  selectable?: boolean;
  /** Tooltip shown when hovering the row (GtkWidget:tooltip-text). */
  tooltipText?: string;
  /**
   * Whether the row is insensitive (GtkWidget:sensitive = false): neither it
   * nor anything in it takes clicks, keys or focus. Default: false.
   */
  disabled?: boolean;
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
    tooltipText,
    disabled = false,
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
  // GTK_LIST_TAB_ALL. An insensitive row can't, nor anything in it.
  return placeRow(
    <div
      ref={ref}
      role="listitem"
      tabIndex={disabled ? undefined : 0}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-selectable={selectable || undefined}
      {...tooltipAttrs(tooltipText)}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      inert={disabled || undefined}
      {...rest}
    >
      {children}
    </div>,
  );
});

/**
 * A list's selected rows, and the row GtkListBox calls selected_row: the last
 * one selected without Shift, which Shift extends the selection from.
 */
export interface GtkListBoxSelection {
  rows: ReadonlySet<number>;
  anchor: number | null;
}

export interface GtkListBoxSelectionRules {
  mode: GtkSelectionMode;
  /** Whether a row can be selected (GtkListBoxRow:selectable). */
  selectable: (row: number) => boolean;
  /** How many rows the list has. */
  count: number;
}

/** Like gtk_list_box_select_row_internal(): adds the row, never toggles it. */
export function selectRow(
  selection: GtkListBoxSelection,
  row: number,
  { mode, selectable }: GtkListBoxSelectionRules,
): GtkListBoxSelection {
  if (!selectable(row) || selection.rows.has(row) || mode === "none") return selection;
  return { rows: new Set(mode === "multiple" ? [...selection.rows, row] : [row]), anchor: row };
}

/** Like gtk_list_box_unselect_row_internal(). */
export function unselectRow(
  selection: GtkListBoxSelection,
  row: number,
  { mode }: GtkListBoxSelectionRules,
): GtkListBoxSelection {
  if (!selection.rows.has(row) || mode === "none") return selection;
  if (mode !== "multiple") return { rows: new Set(), anchor: null };
  return { rows: new Set([...selection.rows].filter((r) => r !== row)), anchor: selection.anchor };
}

/**
 * Like gtk_list_box_update_selection(): what clicking a row (`modify` with
 * Ctrl, `extend` with Shift) or moving the cursor onto it does.
 */
export function updateSelection(
  selection: GtkListBoxSelection,
  row: number,
  { mode, selectable }: GtkListBoxSelectionRules,
  modify: boolean,
  extend: boolean,
): GtkListBoxSelection {
  if (mode === "none" || !selectable(row)) return selection;
  if (mode === "browse") return { rows: new Set([row]), anchor: row };
  if (mode === "single") {
    const selected = !modify || !selection.rows.has(row);
    return { rows: new Set(selected ? [row] : []), anchor: selected ? row : null };
  }
  if (extend && selection.anchor !== null) {
    const rows = new Set<number>();
    const to = Math.max(selection.anchor, row);
    for (let r = Math.min(selection.anchor, row); r <= to; r++) if (selectable(r)) rows.add(r);
    return { rows, anchor: selection.anchor };
  }
  if (modify && !extend) {
    const rows = new Set(selection.rows);
    if (!rows.delete(row)) rows.add(row);
    return { rows, anchor: selection.anchor };
  }
  return { rows: new Set([row]), anchor: row };
}

/** Like gtk_list_box_select_all(): only in multiple mode. */
export function selectAll(
  selection: GtkListBoxSelection,
  { mode, selectable, count }: GtkListBoxSelectionRules,
): GtkListBoxSelection {
  if (mode !== "multiple") return selection;
  const rows = new Set<number>();
  for (let r = 0; r < count; r++) if (selectable(r)) rows.add(r);
  return { rows, anchor: selection.anchor };
}

/** Like gtk_list_box_unselect_all(): not in browse mode. */
export function unselectAll(
  selection: GtkListBoxSelection,
  { mode }: GtkListBoxSelectionRules,
): GtkListBoxSelection {
  if (mode === "browse" || mode === "none") return selection;
  return { rows: new Set(), anchor: null };
}

/**
 * Widgets that claim the clicks on them, so the list doesn't see them
 * (gtk_gesture_set_state()): buttons, text, check buttons, switches, scales,
 * links and tabs.
 */
const CLAIMING_WIDGETS =
  'button, input, select, textarea, a[href], [contenteditable="true"], [role="checkbox"], [role="link"], [role="radio"], [role="slider"], [role="spinbutton"], [role="switch"], [role="tab"]';

/** The list's rows, in order. Each knows its index (see useListBoxRow()). */
function listRows(list: HTMLElement): HTMLElement[] {
  return Array.from(list.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute("data-gtk-row-index"),
  );
}

function rowIndex(row: Element): number {
  return Number(row.getAttribute("data-gtk-row-index"));
}

function isSensitive(row: Element): boolean {
  return !row.hasAttribute("data-disabled");
}

/**
 * The row a page up (-1) or down (1) from `from`, like
 * gtk_list_box_move_cursor(): a page is the scrolled window's page increment
 * (0.9 of its height), or 100px.
 */
function pageRow(
  list: HTMLElement,
  rows: HTMLElement[],
  from: HTMLElement,
  count: number,
): HTMLElement | undefined {
  const viewport = list.parentElement;
  const scroller = viewport?.classList.contains("gtk-viewport") ? viewport.parentElement : null;
  const page = scroller ? scroller.clientHeight * 0.9 : 100;
  const top = list.getBoundingClientRect().top + list.clientTop;
  const y = (row: HTMLElement) => row.getBoundingClientRect().top - top;
  const end = Math.min(Math.max(y(from) + page * count, 0), list.clientHeight - 1);
  const row = rows.find((r) => y(r) <= end && end < y(r) + r.getBoundingClientRect().height);
  if (!row) return count > 0 ? rows.at(-1) : rows[0];
  // At least one row.
  return row === from ? rows[rows.indexOf(from) + count] : row;
}

export interface GtkListBoxProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Selection behavior. Default: "single". */
  selectionMode?: GtkSelectionMode;
  /** Activate on single click instead of double. Default: true. */
  activateOnSingleClick?: boolean;
  /** Show separators between rows. Default: false. */
  showSeparators?: boolean;
  /** Placeholder shown when no rows are visible. */
  placeholder?: ReactNode;
  /**
   * Callback when an activatable row is activated: clicked (twice with
   * `activateOnSingleClick={false}`), or Enter/Space pressed on it.
   */
  onRowActivated?: (index: number) => void;
  /** Callback when the selection changes, with the selected rows' indices in order. */
  onSelectedRowsChanged?: (indices: number[]) => void;
  /**
   * Controlled selection: indices of the selected rows. When set, the list
   * shows exactly these rows as selected and only reports changes.
   */
  selectedRows?: number[];
  /**
   * Whether the list and its rows are insensitive (GtkWidget:sensitive =
   * false): they take no clicks, keys or focus. Default: false.
   */
  disabled?: boolean;
  /**
   * The rows: GtkListBoxRows, or components that render one, like
   * AdwActionRow. Any other child is put in a GtkListBoxRow, like
   * gtk_list_box_insert(). A row's index counts the children before it, apart
   * from null, undefined and booleans.
   */
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
    disabled = false,
    children,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    onClick,
    onFocus,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const listRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => listRef.current as HTMLDivElement);

  // Children that render no row of their own are put in one. Text and DOM
  // elements are right away; other components once they've rendered, since
  // any component can render a row through useListBoxRow().
  const items = Children.toArray(children);
  const [bare, setBare] = useState<ReadonlyMap<React.Key, unknown>>(() => new Map());
  const needsRow = (item: ReactNode) =>
    !isValidElement(item) ||
    typeof item.type === "string" ||
    (item.key !== null && bare.get(item.key) === item.type);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // Anything between two rows comes from the children between them.
    const next = new Map(bare);
    let changed = false;
    let after = -1;
    let other = false;
    const wrap = (before: number) => {
      for (let i = after + 1; other && i < before; i++) {
        const item = items[i];
        if (isValidElement(item) && item.key !== null && next.get(item.key) !== item.type) {
          next.set(item.key, item.type);
          changed = true;
        }
      }
      other = false;
    };
    for (const node of list.childNodes) {
      if (node instanceof Element && node.hasAttribute("data-gtk-row-index")) {
        wrap(rowIndex(node));
        after = rowIndex(node);
      } else if (
        node instanceof Element
          ? !node.classList.contains("gtk-placeholder")
          : node instanceof Text && node.data.trim() !== ""
      ) {
        other = true;
      }
    }
    wrap(items.length);
    if (changed) setBare(next);
  });

  // Rows with selectable={false} can't be selected (gtk_list_box_select_row()
  // ignores them).
  const selectable = items.map(
    (item) => !isValidElement<GtkListBoxRowProps>(item) || item.props.selectable !== false,
  );
  const rules: GtkListBoxSelectionRules = {
    mode: selectionMode,
    selectable: (row) => selectable[row] ?? false,
    count: items.length,
  };

  const [internalSelected, setInternalSelected] = useState<ReadonlySet<number>>(() => new Set());
  // Like gtk_list_box_select_row(): nothing is selected in "none" mode, and
  // selecting a row in "single"/"browse" mode unselects the others.
  const selectableRows = selectedRows?.filter((row) => rules.selectable(row));
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
  const stillSelectable = [...internalSelected].filter((row) => rules.selectable(row));
  if (!selectedRows && stillSelectable.length !== internalSelected.size) {
    setInternalSelected(new Set(stillSelectable));
  }
  const selectedIndices: ReadonlySet<number> = new Set(controlledSelection ?? stillSelectable);

  // GtkListBox's selected_row (see GtkListBoxSelection) and cursor_row: the
  // focused row, unless the cursor moved on to an insensitive row, which can't
  // take focus.
  const anchor = useRef<number | null>(null);
  const cursor = useRef<number | null>(null);
  // Set while the list moves focus itself.
  const focusing = useRef(false);

  const selection = (): GtkListBoxSelection => ({
    rows: selectedIndices,
    anchor: anchor.current !== null && anchor.current < items.length ? anchor.current : null,
  });
  const setSelection = (next: GtkListBoxSelection) => {
    anchor.current = next.anchor;
    const rows = [...next.rows].sort((a, b) => a - b);
    if (rows.length === selectedIndices.size && rows.every((row) => selectedIndices.has(row))) {
      return;
    }
    if (!selectedRows) setInternalSelected(next.rows);
    onSelectedRowsChanged?.(rows);
  };

  // gtk_list_box_update_cursor()
  const updateCursor = (row: HTMLElement, grabFocus: boolean) => {
    cursor.current = rowIndex(row);
    if (!grabFocus || !isSensitive(row) || row.contains(document.activeElement)) return;
    focusing.current = true;
    row.focus();
    focusing.current = false;
  };
  // gtk_list_box_activate(): only activatable rows are.
  const activate = (row: HTMLElement) => {
    if (row.hasAttribute("data-gtk-activatable")) onRowActivated?.(rowIndex(row));
  };
  // gtk_list_box_select_and_activate()
  const selectAndActivate = (row: HTMLElement) => {
    setSelection(selectRow(selection(), rowIndex(row), rules));
    updateCursor(row, true);
    activate(row);
  };

  // gtk_list_box_click_gesture_pressed() and _released(), with e.detail as
  // the number of presses.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    const target = e.target;
    // Not a click in a row's popover.
    if (e.defaultPrevented || !(target instanceof Element) || !e.currentTarget.contains(target)) {
      return;
    }
    const row = listRows(e.currentTarget).find((r) => r.contains(target));
    if (!row || !isSensitive(row)) return;
    const widget = target.closest(CLAIMING_WIDGETS);
    if (widget && widget !== row && row.contains(widget)) return;
    const presses = Math.max(e.detail, 1);
    if (presses === 2 && !activateOnSingleClick) activate(row);
    if (presses === 1 && activateOnSingleClick) {
      selectAndActivate(row);
    } else {
      updateCursor(row, true);
      const modify = e.ctrlKey || e.metaKey;
      setSelection(updateSelection(selection(), rowIndex(row), rules, modify, e.shiftKey));
    }
  };

  // Keyboard focus moving onto a row selects it (gtk_list_box_row_set_focus()),
  // and Tab into the list goes to its selected row (gtk_list_box_focus()).
  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    onFocus?.(e);
    const list = e.currentTarget;
    const rows = listRows(list);
    let row = rows.find((r) => r === e.target);
    if (!row) return;
    cursor.current = rowIndex(row);
    // Not focus the list moves itself, or a click's: that selects on release.
    if (focusing.current || !row.matches(":focus-visible")) return;
    if (!list.contains(e.relatedTarget as Node | null)) {
      const last = selection().anchor;
      const selected =
        (last !== null && selectedIndices.has(last)
          ? rows.find((r) => rowIndex(r) === last)
          : undefined) ?? rows.find((r) => selectedIndices.has(rowIndex(r)));
      if (selected && isSensitive(selected)) {
        updateCursor(selected, true);
        row = selected;
      }
    }
    setSelection(updateSelection(selection(), rowIndex(row), rules, false, false));
  };

  // The list's key bindings, for keys pressed on a row itself.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const list = e.currentTarget;
    const rows = listRows(list);
    const focused = rows.find((r) => r === e.target);
    if (!focused) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const current = rows.find((r) => rowIndex(r) === cursor.current && !isSensitive(r)) ?? focused;
    if (e.key === " " && ctrl && !e.altKey) {
      // toggle-cursor-row
      e.preventDefault();
      const index = rowIndex(current);
      const toggles = selectionMode === "single" || selectionMode === "multiple";
      if (toggles && selectedIndices.has(index)) {
        setSelection(unselectRow(selection(), index, rules));
      } else {
        selectAndActivate(current);
      }
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && !ctrl && !e.altKey) {
      // The row's activate signal (gtk_list_box_row_activate()).
      e.preventDefault();
      selectAndActivate(focused);
      return;
    }
    if (e.key.toLowerCase() === "a" && ctrl && !e.altKey) {
      // select-all and unselect-all
      e.preventDefault();
      setSelection(e.shiftKey ? unselectAll(selection(), rules) : selectAll(selection(), rules));
      return;
    }
    if (e.altKey) return;
    // move-cursor: Shift extends the selection, Ctrl moves without selecting.
    const at = rows.indexOf(current);
    const sensitive = rows.filter(isSensitive);
    let target: HTMLElement | undefined;
    switch (e.key) {
      case "ArrowUp":
        target = rows[at - 1];
        break;
      case "ArrowDown":
        target = rows[at + 1];
        break;
      case "Home":
        target = sensitive[0];
        break;
      case "End":
        target = sensitive.at(-1);
        break;
      case "PageUp":
      case "PageDown":
        target = pageRow(list, rows, current, e.key === "PageUp" ? -1 : 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    // Past either end, nothing happens (keynav-failed).
    if (!target || target === current) return;
    updateCursor(target, true);
    if (!ctrl) {
      setSelection(updateSelection(selection(), rowIndex(target), rules, false, e.shiftKey));
    }
  };

  const classes = ["gtk-list"];
  if (showSeparators) classes.push("separators");
  if (className) classes.push(className);

  return (
    <div
      ref={listRef}
      role="list"
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      inert={disabled || undefined}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {/* Its rows are its own, not an enclosing preferences group's. */}
      <GtkListBoxRowContext.Provider value={null}>
        {items.length === 0 && placeholder ? (
          <div className="gtk-placeholder">{placeholder}</div>
        ) : (
          items.map((item, index) => (
            <GtkListBoxSlotContext.Provider
              key={isValidElement(item) && item.key !== null ? item.key : index}
              value={{
                index,
                canSelect: selectionMode !== "none" && rules.selectable(index),
                selected: selectedIndices.has(index),
                disabled,
              }}
            >
              {needsRow(item) ? <GtkListBoxRow>{item}</GtkListBoxRow> : item}
            </GtkListBoxSlotContext.Provider>
          ))
        )}
      </GtkListBoxRowContext.Provider>
    </div>
  );
});
