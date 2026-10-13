import { forwardRef, type HTMLAttributes, useCallback, useMemo, useState } from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkDropDownProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** List of items (strings for simple mode). */
  items: string[];
  /** Index of the selected item. */
  selected?: number;
  /** Whether to show search in the popup. Default: false. */
  enableSearch?: boolean;
  /** Whether to show the dropdown arrow. Default: true. */
  showArrow?: boolean;
  /** Callback when selection changes. */
  onSelected?: (index: number) => void;
}

/**
 * GtkDropDown — A dropdown selection widget.
 *
 * CSS node:
 *   dropdown
 *     ├── button.toggle > box > stack + arrow
 *     └── popover.menu > scrolledwindow > listview
 *
 * @see https://docs.gtk.org/gtk4/class.DropDown.html
 */
export const GtkDropDown = forwardRef<HTMLDivElement, GtkDropDownProps>(function GtkDropDown(
  {
    items,
    selected: controlledSelected,
    enableSearch = false,
    showArrow = true,
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

  const selected = isControlled ? controlledSelected : internalSelected;

  const ArrowIcon = useIcon("PanDown");
  const CheckIcon = useIcon("ObjectSelect");

  const classes = ["gtk-dropdown"];
  if (className) classes.push(className);

  const filteredItems = useMemo(() => {
    if (!search) return items.map((item, i) => ({ item, index: i }));
    const lower = search.toLowerCase();
    return items
      .map((item, i) => ({ item, index: i }))
      .filter(({ item }) => item.toLowerCase().includes(lower));
  }, [items, search]);

  const selectItem = useCallback(
    (index: number) => {
      if (!isControlled) setInternalSelected(index);
      onSelected?.(index);
      setOpen(false);
      setSearch("");
    },
    [isControlled, onSelected],
  );

  const selectedText = items[selected] ?? "(None)";

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      <button
        type="button"
        className={`gtk-button toggle ${open ? "has-open-popup" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-checked={open || undefined}
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
      >
        <span className="gtk-label">{selectedText}</span>
        {showArrow && ArrowIcon && (
          <span className="gtk-arrow down">
            <ArrowIcon size={16} />
          </span>
        )}
      </button>
      {open && (
        <div className="gtk-popover background menu">
          <div className="gtk-contents">
            {enableSearch && (
              <div className="dropdown-searchbar">
                <div className="gtk-entry search">
                  <input
                    type="search"
                    className="gtk-text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="gtk-scrolledwindow" style={{ maxHeight: 400, overflowY: "auto" }}>
              <div className="gtk-listview" role="listbox">
                {filteredItems.map(({ item, index }) => (
                  <div
                    key={index}
                    className={`gtk-row activatable ${index === selected ? "selected" : ""}`}
                    role="option"
                    aria-selected={index === selected}
                    onClick={() => selectItem(index)}
                  >
                    <span className="gtk-label">{item}</span>
                    {index === selected && CheckIcon && (
                      <span className="gtk-image">
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
