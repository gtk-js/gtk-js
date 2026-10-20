import {
  GtkLabel,
  GtkPopover,
  GtkSearchEntry,
  useIcon,
  useListBoxRow,
  wrapStyle,
} from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export interface AdwComboRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  items: string[];
  selected?: number;
  enableSearch?: boolean;
  /** How the search matches items (AdwComboRow:search-match-mode). Default: "prefix". */
  searchMatchMode?: "exact" | "substring" | "prefix";
  useSubtitle?: boolean;
  iconName?: string;
  /** Whether the row is insensitive (GtkWidget:sensitive = false). Default: false. */
  disabled?: boolean;
  onSelected?: (index: number) => void;
}

/** Like gtk_string_filter_prepare(): GtkStringFilter ignores case by default. */
const prepare = (text: string) => text.normalize("NFKD").toLowerCase();

/**
 * AdwComboRow — An ActionRow with a dropdown selection.
 *
 * CSS node:
 *   row.combo
 *     └── box.header
 *         ├── image.icon
 *         ├── box.title > label.title + label.subtitle
 *         └── box.suffixes
 *             ├── listview.view.inline > row > box > label   (the selected item)
 *             └── box > image.dropdown-arrow + popover.menu
 *
 * Its popover (popover.menu) points at the dropdown arrow, like the GtkPopover
 * in arrow_box.
 *
 * @see upstream/libadwaita/src/adw-combo-row.ui
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ComboRow.html
 */
export const AdwComboRow = forwardRef<HTMLDivElement, AdwComboRowProps>(function AdwComboRow(
  {
    title,
    subtitle,
    items,
    selected: controlledSelected,
    enableSearch = false,
    searchMatchMode = "prefix",
    useSubtitle = false,
    iconName,
    disabled = false,
    onSelected,
    className,
    style,
    onClick,
    onDoubleClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const isControlled = controlledSelected !== undefined;
  const [internalSelected, setInternalSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = isControlled ? controlledSelected : internalSelected;
  const rowRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // The item the popover's list view focuses: it keeps its focus position
  // between popups.
  const focusPosition = useRef(0);
  const titleId = useId();
  const subtitleId = useId();
  const listId = useId();

  const ArrowIcon = useIcon("PanDown");
  const CheckIcon = useIcon("ObjectSelect");
  const Icon = useIcon(iconName ?? "");

  // model_changed(): the arrow and activation need more than one item.
  const canOpen = items.length > 1;

  const filtered = useMemo(() => {
    const all = items.map((item, i) => ({ item, i }));
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

  // Closing the popover clears the search (notify_popover_visible_cb()) and
  // gives the focus back to the row, as a GtkPopover does to its parent.
  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    if (
      rowRef.current?.contains(document.activeElement) ||
      document.activeElement === document.body
    ) {
      rowRef.current?.focus();
    }
  }, []);

  // An insensitive row, or one with nothing to choose from, has no popup.
  useEffect(() => {
    if (open && (disabled || !canOpen)) close();
  }, [open, disabled, canOpen, close]);

  const selectItem = useCallback(
    (i: number) => {
      // adw_combo_row_set_selected() ignores the selected position.
      if (i !== selected) {
        if (!isControlled) setInternalSelected(i);
        onSelected?.(i);
      }
      close();
      rowRef.current?.focus();
    },
    [selected, isControlled, onSelected, close],
  );

  const listRows = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>(".gtk-row") ?? []);

  // The list view gives the focus to its focus position: the item focused
  // last, the first one at first.
  const focusList = () => {
    const rows = listRows();
    const index = filtered.findIndex(({ i }) => i === focusPosition.current);
    (rows[index] ?? rows[0])?.focus();
  };

  // The popover's focus stops: the search entry, then the list.
  const focusStop = (stop: number) => {
    if (stop === 0 && enableSearch) searchRef.current?.focus();
    else focusList();
  };

  // Popping up focuses the popover's first focus stop (gtk_popover_show()).
  useEffect(() => {
    if (open) focusStop(0);
  }, [open]);

  // The popover is a surface of its own: its clicks reach neither the row nor
  // a list box around it. An insensitive row takes none.
  const ignoresClick = (e: MouseEvent<HTMLDivElement>) =>
    disabled || !!popoverRef.current?.contains(e.target as Node);

  // GtkListBox activates the row under the pointer, wherever it's clicked, and
  // adw_combo_row_activate() pops the popover up.
  const handleRowClick = (e: MouseEvent<HTMLDivElement>) => {
    if (ignoresClick(e)) return;
    onClick?.(e);
    if (e.defaultPrevented || !canOpen) return;
    if (open) close();
    else setOpen(true);
  };

  // Enter and Space activate the row. While the popover is up, Tab goes into
  // it (adw_combo_row_focus()).
  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.target !== e.currentTarget || disabled) return;
    if ((e.key === "Enter" || e.key === " ") && canOpen) {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "Tab" && open) {
      e.preventDefault();
      focusStop(e.shiftKey ? 1 : 0);
    }
  };

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

  // search_stop_cb(): Escape drops the search, or pops down when there's none.
  const handleStopSearch = () => (search ? setSearch("") : close());

  // The popover's list view: the arrows, Home, End, Page Up and Page Down move
  // the focus (gtk_list_base_move_cursor*()), Enter activates the focused item.
  // Space only selects it, which a menu doesn't show.
  const handleListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rows = listRows();
    const row = e.target as HTMLElement;
    const index = rows.indexOf(row);
    if (index < 0) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[index];
      if (item) selectItem(item.i);
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

  const selectedItem = items[selected];
  const displaySubtitle = useSubtitle ? selectedItem : subtitle;

  const placeRow = useListBoxRow();
  const classes = ["gtk-row", "combo"];
  // GTK never applies :hover or :active to an insensitive widget.
  if (canOpen && !disabled) classes.push("activatable");
  if (open) classes.push("has-open-popup");
  if (className) classes.push(className);

  // An insensitive widget's children are insensitive too.
  const insensitive = disabled || undefined;

  return placeRow(
    <div
      ref={(el) => {
        rowRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      className={classes.join(" ")}
      role="combobox"
      tabIndex={disabled ? undefined : 0}
      aria-labelledby={titleId}
      aria-describedby={displaySubtitle ? subtitleId : undefined}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-disabled={insensitive}
      data-disabled={insensitive}
      style={{ position: "relative", ...style }}
      onClick={handleRowClick}
      onDoubleClick={(e) => {
        if (!ignoresClick(e)) onDoubleClick?.(e);
      }}
      onKeyDown={handleRowKeyDown}
      {...rest}
    >
      <div className="gtk-box gtk-box-layout horizontal header" style={{ alignItems: "center" }}>
        {Icon && (
          <span className="gtk-image icon" data-disabled={insensitive}>
            <Icon size={16} />
          </span>
        )}
        <div className="gtk-box gtk-box-layout vertical title" style={{ flex: 1 }}>
          <span
            id={titleId}
            className="gtk-label title"
            data-disabled={insensitive}
            style={wrapStyle("word-char")}
          >
            {title}
          </span>
          {displaySubtitle && (
            <span
              id={subtitleId}
              className="gtk-label subtitle"
              data-disabled={insensitive}
              style={wrapStyle("word-char")}
            >
              {displaySubtitle}
            </span>
          )}
        </div>
        <div className="gtk-box gtk-box-layout horizontal suffixes">
          {!useSubtitle && (
            // The selected item, made by the item factory in a list view of its
            // own (`current`), which takes no input (can-target FALSE).
            <div
              className="gtk-listview view inline"
              data-valign="center"
              data-disabled={insensitive}
              style={{ pointerEvents: "none" }}
            >
              {selectedItem !== undefined && (
                <div className="gtk-row activatable">
                  <div className="gtk-box gtk-box-layout horizontal">
                    <GtkLabel
                      label={selectedItem}
                      xalign={0}
                      ellipsize="end"
                      maxWidthChars={20}
                      widthChars={1}
                      valign="center"
                      data-disabled={insensitive}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {canOpen && (
            <div className="gtk-box gtk-box-layout horizontal" data-valign="center">
              {ArrowIcon && (
                <span
                  ref={arrowRef}
                  className="gtk-image dropdown-arrow"
                  data-disabled={insensitive}
                >
                  <ArrowIcon size={16} />
                </span>
              )}
              <GtkPopover
                ref={popoverRef}
                visible={open}
                className="menu"
                position="bottom"
                anchorRef={rowRef}
                pointingTo={arrowRef}
                onClosed={close}
              >
                <div className="gtk-box gtk-box-layout vertical" onKeyDown={handlePopoverKeyDown}>
                  {enableSearch && (
                    <GtkSearchEntry
                      ref={searchRef}
                      className="combo-searchbar"
                      placeholderText="Search"
                      // width-chars and max-width-chars 6 (adw-combo-row.ui).
                      style={{ width: "6ch" }}
                      onSearchChanged={setSearch}
                      onStopSearch={handleStopSearch}
                      onKeyDown={handleSearchKeyDown}
                    />
                  )}
                  <div className="gtk-scrolledwindow" style={{ maxHeight: 400, overflowY: "auto" }}>
                    <div className="gtk-viewport">
                      <div
                        ref={listRef}
                        id={listId}
                        className="gtk-list"
                        role="listbox"
                        onKeyDown={handleListKeyDown}
                      >
                        {filtered.map(({ item, i }) => (
                          // Every item has the checkmark; only the selected one shows it,
                          // so the items line up (selected_item_changed()).
                          <div
                            key={i}
                            className="gtk-row activatable"
                            role="option"
                            tabIndex={-1}
                            aria-selected={i === selected}
                            onFocus={() => {
                              focusPosition.current = i;
                            }}
                            onClick={() => selectItem(i)}
                          >
                            <div className="gtk-box gtk-box-layout horizontal">
                              <GtkLabel
                                label={item}
                                xalign={0}
                                ellipsize="end"
                                maxWidthChars={20}
                                widthChars={1}
                                valign="center"
                              />
                              {CheckIcon && (
                                <span
                                  className="gtk-image"
                                  style={{ opacity: i === selected ? 1 : 0 }}
                                >
                                  <CheckIcon size={16} />
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </GtkPopover>
            </div>
          )}
        </div>
      </div>
    </div>,
  );
});
