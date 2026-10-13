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
    // below it. Rows register through GtkListBoxRowContext (useListBoxRow), so
    // a child renders in the list until it has mounted without registering.
    const items = Children.toArray(children).map((child, index) => ({
      child,
      key: isValidElement(child) && child.key != null ? child.key : `#${index}`,
    }));
    const rowCounts = useRef(new Map<string, number>());
    const registrations = useRef(new Map<string, () => () => void>());
    const [others, setOthers] = useState<ReadonlySet<string>>(() => new Set());

    const registration = (key: string) => {
      let register = registrations.current.get(key);
      if (!register) {
        register = () => {
          rowCounts.current.set(key, (rowCounts.current.get(key) ?? 0) + 1);
          return () => rowCounts.current.set(key, (rowCounts.current.get(key) ?? 1) - 1);
        };
        registrations.current.set(key, register);
      }
      return register;
    };

    useLayoutEffect(() => {
      const present = new Set(items.map(({ key }) => key));
      for (const key of registrations.current.keys()) {
        if (!present.has(key)) {
          registrations.current.delete(key);
          rowCounts.current.delete(key);
        }
      }
      const next = new Set([...present].filter((key) => !rowCounts.current.get(key)));
      if (next.size !== others.size || [...next].some((key) => !others.has(key))) {
        setOthers(next);
      }
    });

    const slot = ({ child, key }: (typeof items)[number]) => (
      <GtkListBoxRowContext.Provider key={key} value={registration(key)}>
        {child}
      </GtkListBoxRowContext.Provider>
    );
    const rows = items.filter(({ key }) => !others.has(key));

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
                className={`gtk-list ${separateRows ? "boxed-list-separate" : "boxed-list"}`}
                role="list"
                style={{ display: "flex", flexDirection: "column" }}
              >
                {rows.map(slot)}
              </div>
            )}
            {items.filter(({ key }) => others.has(key)).map(slot)}
          </div>
        </div>
      </div>
    );
  },
);
