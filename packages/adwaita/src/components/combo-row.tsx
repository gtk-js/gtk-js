import { GtkLabel, GtkPopover, useIcon, useListBoxRow } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  useCallback,
  useEffect,
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
  useSubtitle?: boolean;
  iconName?: string;
  onSelected?: (index: number) => void;
}

/**
 * AdwComboRow — An ActionRow with a dropdown selection.
 *
 * CSS node: row.combo; its popover (popover.menu) points at the dropdown
 * arrow, like the GtkPopover in arrow_box.
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
    useSubtitle = false,
    iconName,
    onSelected,
    className,
    style,
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
  const listRef = useRef<HTMLDivElement>(null);

  const ArrowIcon = useIcon("PanDown");
  const CheckIcon = useIcon("ObjectSelect");
  const PrefixIcon = useIcon(iconName ?? "");

  const filtered = useMemo(() => {
    if (!search) return items.map((item, i) => ({ item, i }));
    return items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => item.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

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

  const selectItem = useCallback(
    (i: number) => {
      if (!isControlled) setInternalSelected(i);
      onSelected?.(i);
      close();
      rowRef.current?.focus();
    },
    [isControlled, onSelected, close],
  );

  // Opening focuses the selected item, so the keyboard picks up from it.
  useEffect(() => {
    if (!open) return;
    const items = listRef.current?.querySelectorAll<HTMLElement>(".gtk-row");
    const current = listRef.current?.querySelector<HTMLElement>('.gtk-row[aria-selected="true"]');
    (current ?? items?.[0])?.focus({ preventScroll: false });
  }, [open]);

  // adw_combo_row_activate(): activating the row (a click, Enter or Space)
  // pops the popover up.
  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  // The popover's list view: the arrows, Home and End move between items,
  // Enter and Space pick one.
  const handleListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(".gtk-row"));
    const index = rows.indexOf(e.target as HTMLElement);
    if (index < 0) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = filtered[index];
      if (item) selectItem(item.i);
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
    rows[Math.max(0, Math.min(rows.length - 1, target))]?.focus();
  };

  const displaySubtitle = useSubtitle ? items[selected] : subtitle;

  const placeRow = useListBoxRow();
  const classes = ["gtk-row", "combo", "activatable"];
  if (open) classes.push("has-open-popup");
  if (className) classes.push(className);

  return placeRow(
    <div
      ref={(el) => {
        rowRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      className={classes.join(" ")}
      tabIndex={0}
      aria-haspopup="listbox"
      aria-expanded={open}
      style={{ position: "relative", ...style }}
      onKeyDown={handleRowKeyDown}
      {...rest}
    >
      <div
        className="gtk-box gtk-box-layout horizontal header"
        style={{ alignItems: "center", cursor: "pointer" }}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {PrefixIcon && (
          <div className="gtk-box gtk-box-layout horizontal prefixes">
            <span className="gtk-image">
              <PrefixIcon size={16} />
            </span>
          </div>
        )}
        <div className="gtk-box gtk-box-layout vertical title" style={{ flex: 1 }}>
          <span className="gtk-label title">{title}</span>
          {displaySubtitle && <span className="gtk-label subtitle">{displaySubtitle}</span>}
        </div>
        {!useSubtitle && <span className="gtk-label">{items[selected] ?? ""}</span>}
        {ArrowIcon && (
          <span ref={arrowRef} className="gtk-image dropdown-arrow">
            <ArrowIcon size={16} />
          </span>
        )}
      </div>
      <GtkPopover
        visible={open}
        className="menu"
        position="bottom"
        anchorRef={rowRef}
        pointingTo={arrowRef}
        onClosed={close}
      >
        <div className="gtk-box gtk-box-layout vertical">
          {enableSearch && (
            <div className="gtk-entry search combo-searchbar">
              <input
                type="search"
                className="gtk-text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="gtk-scrolledwindow" style={{ maxHeight: 400, overflowY: "auto" }}>
            <div className="gtk-viewport">
              <div ref={listRef} className="gtk-list" role="listbox" onKeyDown={handleListKeyDown}>
                {filtered.map(({ item, i }) => (
                  // Every item has the checkmark; only the selected one shows it,
                  // so the items line up (selected_item_changed()).
                  <div
                    key={i}
                    className="gtk-row activatable"
                    role="option"
                    tabIndex={-1}
                    aria-selected={i === selected}
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
                        <span className="gtk-image" style={{ opacity: i === selected ? 1 : 0 }}>
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
    </div>,
  );
});
