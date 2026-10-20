import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { GtkLabel } from "./label.tsx";
import { GtkPopover, shadowExtents } from "./popover.tsx";
import { GtkSearchEntry } from "./search-entry.tsx";

export interface GtkDropDownProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** List of items (strings for simple mode). */
  items: string[];
  /** Index of the selected item. */
  selected?: number;
  /** Whether to show search in the popup. Default: false. */
  enableSearch?: boolean;
  /** How the search matches items (GtkDropDown:search-match-mode). Default: "prefix". */
  searchMatchMode?: "exact" | "substring" | "prefix";
  /** Whether to show the dropdown arrow. Default: true. */
  showArrow?: boolean;
  /** Whether the dropdown is insensitive (GtkWidget:sensitive = false). Default: false. */
  disabled?: boolean;
  /** Callback when selection changes. */
  onSelected?: (index: number) => void;
}

/** Like gtk_string_filter_prepare(): GtkStringFilter ignores case by default. */
const prepare = (text: string) => text.normalize("NFKD").toLowerCase();

/**
 * GtkDropDown — A dropdown selection widget.
 *
 * CSS node (rows are GtkListItemWidgets, bin layouts):
 *   dropdown
 *     ├── button.toggle > box > stack > row > box > label
 *     │                       └── arrow
 *     └── popover.menu > contents > box.vertical
 *           ├── box.dropdown-searchbar > entry.search
 *           └── scrolledwindow > listview.view > row > box > label + image
 *
 * @see upstream/gtk/gtk/ui/gtkdropdown.ui
 * @see https://docs.gtk.org/gtk4/class.DropDown.html
 */
export const GtkDropDown = forwardRef<HTMLDivElement, GtkDropDownProps>(function GtkDropDown(
  {
    items,
    selected: controlledSelected,
    enableSearch = false,
    searchMatchMode = "prefix",
    showArrow = true,
    disabled = false,
    onSelected,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const isControlled = controlledSelected !== undefined;
  const [internalSelected, setInternalSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [popupWidth, setPopupWidth] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // The item the popup's list view focuses: it keeps its focus position
  // between popups.
  const focusPosition = useRef(0);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

  const selected = isControlled ? controlledSelected : internalSelected;

  const ArrowIcon = useIcon("PanDown");
  const CheckIcon = useIcon("ObjectSelect");

  const classes = ["gtk-dropdown"];
  if (className) classes.push(className);

  const filteredItems = useMemo(() => {
    const all = items.map((item, index) => ({ item, index }));
    if (!search) return all;
    const term = prepare(search);
    return all.filter(({ item }) => {
      const text = prepare(item);
      return searchMatchMode === "exact"
        ? text === term
        : searchMatchMode === "substring"
          ? text.includes(term)
          : text.startsWith(term);
    });
  }, [items, search, searchMatchMode]);

  // Popping down clears the search (popover_closed()) and gives the focus back
  // to the button, as a popover does to its parent (cascade_popdown()).
  const close = useCallback(() => {
    if (
      popoverRef.current?.contains(document.activeElement) ||
      document.activeElement === document.body
    ) {
      buttonRef.current?.focus({ preventScroll: true });
    }
    setOpen(false);
    setSearch("");
  }, []);

  // An insensitive dropdown has no popup.
  useEffect(() => {
    if (open && disabled) close();
  }, [open, disabled, close]);

  const selectItem = useCallback(
    (index: number) => {
      // gtk_drop_down_set_selected() ignores the selected position.
      if (index !== selected) {
        if (!isControlled) setInternalSelected(index);
        onSelected?.(index);
      }
      close();
    },
    [selected, isControlled, onSelected, close],
  );

  const listRows = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>(":scope > .gtk-row") ?? []);

  // The list view gives the focus to its focus position: the item focused
  // last, the first one at first.
  const focusList = () => {
    const rows = listRows();
    const index = filteredItems.findIndex(({ index }) => index === focusPosition.current);
    (rows[index] ?? rows[0])?.focus({ preventScroll: true });
  };

  // The popover's focus stops: the search entry, then the list.
  const focusStop = (stop: number) => {
    if (stop === 0 && enableSearch) searchRef.current?.focus({ preventScroll: true });
    else focusList();
  };

  // gtk_drop_down_size_allocate() requests the dropdown's width for the
  // popover, which counts its contents' shadow in its size.
  useLayoutEffect(() => {
    if (!open) return;
    const contents = popoverRef.current?.querySelector(".gtk-contents");
    const shadow = shadowExtents(contents ? getComputedStyle(contents).boxShadow : "none");
    const width = rootRef.current?.getBoundingClientRect().width ?? 0;
    setPopupWidth(Math.max(0, width - shadow.left - shadow.right));
  }, [open]);

  // Popping up focuses the popover's first focus stop (gtk_popover_show()).
  useEffect(() => {
    if (open) focusStop(0);
  }, [open]);

  // (Shift+)Tab cycles through the popover's focus stops and never leaves it
  // (gtk_popover_focus()).
  const handlePopoverKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || e.defaultPrevented) return;
    e.preventDefault();
    if (enableSearch) focusStop(document.activeElement === searchRef.current ? 1 : 0);
  };

  // GtkText has no Down binding, so Down moves the focus on, to the list.
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusList();
    }
  };

  // search_stop(): Escape drops the search, or pops down when there's none.
  const handleStopSearch = () => (search ? setSearch("") : close());

  // The popup's list view: the arrows, Home, End, Page Up and Page Down move
  // the focus (gtk_list_base_move_cursor*()), Enter activates the focused item
  // (row_activated()). Space only selects it, which a menu doesn't show.
  const handleListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rows = listRows();
    const row = e.target as HTMLElement;
    const index = rows.indexOf(row);
    if (index < 0) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filteredItems[index];
      if (item) selectItem(item.index);
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      return;
    }
    // A page away is the last item still whole in view when the focused one is
    // at the top, and at least the next one.
    const scroller = row.closest<HTMLElement>(".gtk-scrolledwindow");
    const page = Math.max(
      1,
      Math.floor((scroller?.clientHeight ?? 0) / (row.offsetHeight || 1)) - 1,
    );
    const target =
      e.key === "ArrowUp"
        ? index - 1
        : e.key === "ArrowDown"
          ? index + 1
          : e.key === "PageUp"
            ? index - page
            : e.key === "PageDown"
              ? index + page
              : e.key === "Home"
                ? 0
                : e.key === "End"
                  ? rows.length - 1
                  : null;
    if (target === null) return;
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, target))]?.focus();
  };

  const selectedText = items[selected];

  return (
    <div
      ref={rootRef}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      {...rest}
    >
      <button
        ref={buttonRef}
        type="button"
        className="gtk-button toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-checked={open || undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) close();
          else setOpen(true);
        }}
      >
        <div className="gtk-box gtk-box-layout horizontal">
          {/* The selected item, made by the item factory, or "(None)". */}
          <div className="gtk-stack" data-hexpand="true">
            {selectedText === undefined ? (
              <GtkLabel label="(None)" xalign={0} />
            ) : (
              <div className="gtk-row activatable gtk-bin-layout">
                <div className="gtk-box gtk-box-layout horizontal">
                  <GtkLabel label={selectedText} xalign={0} />
                </div>
              </div>
            )}
          </div>
          {showArrow && ArrowIcon && (
            <span className="gtk-arrow">
              <ArrowIcon size={16} />
            </span>
          )}
        </div>
      </button>
      <GtkPopover
        ref={popoverRef}
        visible={open}
        className="menu"
        hasArrow={false}
        position="bottom"
        halign="start"
        anchorRef={rootRef}
        pointingTo={rootRef}
        onClosed={close}
        style={{ minWidth: popupWidth }}
      >
        <div className="gtk-box gtk-box-layout vertical" onKeyDown={handlePopoverKeyDown}>
          {enableSearch && (
            <div className="gtk-box gtk-box-layout horizontal dropdown-searchbar">
              <GtkSearchEntry
                ref={searchRef}
                placeholderText="Search…"
                hexpand
                // width-chars and max-width-chars 6 (gtkdropdown.ui).
                style={{ width: "6ch" }}
                onSearchChanged={setSearch}
                onStopSearch={handleStopSearch}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
          )}
          <div className="gtk-scrolledwindow" style={{ maxHeight: 400, overflowY: "auto" }}>
            <div
              ref={listRef}
              className="gtk-listview view"
              role="listbox"
              onKeyDown={handleListKeyDown}
            >
              {filteredItems.map(({ item, index }) => (
                // Every item has the checkmark; only the selected one shows it,
                // so the items line up (selected_item_changed()).
                <div
                  key={index}
                  className="gtk-row activatable gtk-bin-layout"
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === selected}
                  onFocus={() => {
                    focusPosition.current = index;
                  }}
                  onClick={() => selectItem(index)}
                >
                  <div className="gtk-box gtk-box-layout horizontal">
                    <GtkLabel label={item} xalign={0} />
                    {CheckIcon && (
                      <span className="gtk-image" style={{ opacity: index === selected ? 1 : 0 }}>
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GtkPopover>
    </div>
  );
});
