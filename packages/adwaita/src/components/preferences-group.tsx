import { GtkListBoxRowContext } from "@gtk-js/gtk4";
import {
  Children,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface AdwPreferencesGroupProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  headerSuffix?: ReactNode;
  separateRows?: boolean;
  children?: ReactNode;
}

/**
 * AdwPreferencesGroup — A group of preference rows with title/description.
 *
 * CSS node:
 *   preferencesgroup > box
 *     ├── box.header[.single-line]
 *     │   └── box.labels > label#title + label#description
 *     └── box
 *         ├── listbox.boxed-list   (the rows; only shown when there are some)
 *         └── …                    (other children, like a footer label)
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.PreferencesGroup.html
 */
export const AdwPreferencesGroup = forwardRef<HTMLDivElement, AdwPreferencesGroupProps>(
  function AdwPreferencesGroup(
    { title, description, headerSuffix, separateRows = false, children, className, ...rest },
    ref,
  ) {
    const hasTitle = !!title;
    const hasDescription = !!description;
    const hasHeader = hasTitle || hasDescription || headerSuffix;
    const singleLine = hasTitle && !hasDescription;

    // Like adw_preferences_group_add(): rows go in the list and other widgets
    // below it. Rows register through GtkListBoxRowContext (useListBoxRow), and
    // a component is only known to render one once it has: it starts in the
    // list and moves below it if it rendered something else there. Moving
    // remounts it, so a child that has rendered a row stays in the list even
    // while it renders nothing, and one that renders nothing isn't moved.
    const items = Children.toArray(children).map((child, index) => ({
      child,
      key: isValidElement(child) && child.key != null ? child.key : `#${index}`,
      // Text and plain elements are never rows.
      plain: !isValidElement(child) || typeof child.type === "string",
    }));
    const listRef = useRef<HTMLDivElement>(null);
    const rowCounts = useRef(new Map<string, number>());
    const rowKeys = useRef(new Set<string>());
    const registrations = useRef(new Map<string, () => () => void>());
    const [others, setOthers] = useState<ReadonlySet<string>>(() => new Set());
    const [listEmpty, setListEmpty] = useState(false);
    // Rows register in their layout effects: look again when one comes or goes.
    const [, setRegistrations] = useState(0);

    const registration = (key: string) => {
      let register = registrations.current.get(key);
      if (!register) {
        const count = (delta: number) => {
          rowCounts.current.set(key, (rowCounts.current.get(key) ?? 0) + delta);
          setRegistrations((n) => n + 1);
        };
        register = () => {
          count(1);
          return () => count(-1);
        };
        registrations.current.set(key, register);
      }
      return register;
    };

    useLayoutEffect(() => {
      const present = new Set(items.map(({ key }) => key));
      for (const keys of [registrations.current, rowCounts.current, rowKeys.current]) {
        for (const key of keys.keys()) if (!present.has(key)) keys.delete(key);
      }
      for (const [key, count] of rowCounts.current) if (count > 0) rowKeys.current.add(key);

      const list = listRef.current;
      const nodes = list ? [...list.childNodes] : [];
      const strays = nodes.some(
        (node) => !(node instanceof Element && node.classList.contains("gtk-row")),
      );
      const next = new Set(
        items
          .filter(
            ({ key, plain }) => !plain && !rowKeys.current.has(key) && (strays || others.has(key)),
          )
          .map(({ key }) => key),
      );
      if (next.size !== others.size || [...next].some((key) => !others.has(key))) {
        setOthers(next);
      }
      // GTK hides the list while it has no rows.
      if ((nodes.length === 0) !== listEmpty) setListEmpty(nodes.length === 0);
    });

    const slot = ({ child, key }: (typeof items)[number]) => (
      <GtkListBoxRowContext.Provider key={key} value={registration(key)}>
        {child}
      </GtkListBoxRowContext.Provider>
    );
    const inList = ({ key, plain }: (typeof items)[number]) => !plain && !others.has(key);
    const rows = items.filter(inList);

    const classes = ["gtk-preferencesgroup"];
    if (className) classes.push(className);

    return (
      <div ref={ref} className={classes.join(" ")} {...rest}>
        {/* Spacing comes from the theme's border-spacing: 6px in this box and
            the labels box, none between the labels and the header suffix. */}
        <div className="gtk-box gtk-box-layout vertical">
          {hasHeader && (
            <div
              className={`gtk-box gtk-box-layout horizontal header ${singleLine ? "single-line" : ""}`}
              style={{ alignItems: "center" }}
            >
              <div className="gtk-box gtk-box-layout vertical labels" style={{ flex: 1 }}>
                {hasTitle && <span className="gtk-label heading h4">{title}</span>}
                {hasDescription && (
                  <span className="gtk-label body dimmed description">{description}</span>
                )}
              </div>
              {headerSuffix}
            </div>
          )}
          <div className="gtk-box gtk-box-layout vertical">
            {rows.length > 0 && (
              <div
                ref={listRef}
                className={`gtk-list ${separateRows ? "boxed-list-separate" : "boxed-list"}`}
                role="list"
                style={{ display: listEmpty ? "none" : "flex", flexDirection: "column" }}
              >
                {rows.map(slot)}
              </div>
            )}
            {items.filter((item) => !inList(item)).map(slot)}
          </div>
        </div>
      </div>
    );
  },
);
