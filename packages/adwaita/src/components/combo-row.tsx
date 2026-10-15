import { useIcon, useListBoxRow } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
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
 * CSS node: row.combo
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

  const ArrowIcon = useIcon("PanDown");
  const CheckIcon = useIcon("ObjectSelect");
  const PrefixIcon = useIcon(iconName ?? "");

  const filtered = useMemo(() => {
    if (!search) return items.map((item, i) => ({ item, i }));
    return items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => item.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const selectItem = useCallback(
    (i: number) => {
      if (!isControlled) setInternalSelected(i);
      onSelected?.(i);
      setOpen(false);
      setSearch("");
    },
    [isControlled, onSelected],
  );

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (rowRef.current && e.target instanceof Node && !rowRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

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
      style={{ position: "relative", ...style }}
      {...rest}
    >
      <div
        className="gtk-box gtk-box-layout horizontal header"
        style={{ alignItems: "center", cursor: "pointer" }}
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
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
          <span className="gtk-image dropdown-arrow">
            <ArrowIcon size={16} />
          </span>
        )}
      </div>
      {open && (
        <div
          className="gtk-popover menu"
          style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100 }}
        >
          <div className="gtk-contents">
            {enableSearch && (
              <div
                className="gtk-entry search combo-searchbar"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="search"
                  className="gtk-text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="gtk-scrolledwindow" style={{ maxHeight: 400, overflow: "auto" }}>
              <div className="gtk-viewport">
                <div className="gtk-list">
                  {filtered.map(({ item, i }) => (
                    <div
                      key={i}
                      className="gtk-row activatable"
                      role="option"
                      aria-selected={i === selected}
                      onClick={() => selectItem(i)}
                    >
                      <span className="gtk-label">{item}</span>
                      {i === selected && CheckIcon && (
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
        </div>
      )}
    </div>,
  );
});
