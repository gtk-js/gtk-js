import { GtkListBoxRowContext, orderRows } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useLayoutEffect,
  useMemo,
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
    // below it. Every child is rendered below the list, and a row portals itself
    // into the list (useListBoxRow), so no child moves when it turns out to be a
    // row, or stops being one.
    //
    // The list exists from the first render, so the rows portal into it in the
    // group's first commit: a parent that measures the group when it mounts,
    // like a dialog fixing its natural size, sees them. React doesn't render
    // the list; the group puts it first in its box. None on the server.
    const [list] = useState(() =>
      typeof document === "undefined" ? null : document.createElement("div"),
    );
    const container = useMemo(() => ({ list }), [list]);
    const boxRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      const box = boxRef.current;
      if (!list || !box) return;
      // GTK hides the list while it has no rows: see .gtk-preferencesgroup-list.
      list.setAttribute("role", "list");
      box.prepend(list);
      const stopOrdering = orderRows(list, box);
      return () => {
        stopOrdering();
        list.remove();
      };
    }, [list]);
    useLayoutEffect(() => {
      if (list)
        list.className = `gtk-list gtk-preferencesgroup-list ${separateRows ? "boxed-list-separate" : "boxed-list"}`;
    }, [list, separateRows]);

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
              <GtkListBoxRowContext.Provider value={null}>
                {headerSuffix}
              </GtkListBoxRowContext.Provider>
            </div>
          )}
          <div ref={boxRef} className="gtk-box gtk-box-layout vertical">
            <GtkListBoxRowContext.Provider value={container}>
              {children}
            </GtkListBoxRowContext.Provider>
          </div>
        </div>
      </div>
    );
  },
);
