import { GtkListBoxRowContext, labelText, useRowContainer, wrapStyle } from "@gtk-js/gtk4";
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
} from "react";

export interface AdwPreferencesGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** The title, as Pango markup. */
  title?: string;
  /** The description, as Pango markup. */
  description?: string;
  headerSuffix?: ReactNode;
  separateRows?: boolean;
  children?: ReactNode;
}

/** Whether a row can take focus: it's focusable and not insensitive. */
const canFocus = (row: HTMLElement) => row.tabIndex >= 0 && !row.hasAttribute("data-disabled");

/**
 * The row a key moves the list's cursor to from the `cursor` row, like
 * gtk_list_box_move_cursor(): the group's list has no adjustment, so a page is
 * 100px. Undefined past either end, where the list's keynav fails.
 */
export function cursorRow(
  rows: HTMLElement[],
  cursor: HTMLElement,
  key: string,
): HTMLElement | undefined {
  const at = rows.indexOf(cursor);
  switch (key) {
    case "ArrowUp":
      return rows[at - 1];
    case "ArrowDown":
      return rows[at + 1];
    case "Home":
      return rows.find(canFocus);
    case "End":
      return rows.findLast(canFocus);
    case "PageUp":
    case "PageDown": {
      const count = key === "PageUp" ? -1 : 1;
      const top = (row: HTMLElement) => row.getBoundingClientRect().top;
      const last = rows[rows.length - 1]!;
      const height = top(last) + last.getBoundingClientRect().height - top(rows[0]!);
      const y = Math.min(Math.max(top(cursor) - top(rows[0]!) + 100 * count, 0), height - 1);
      // gtk_list_box_get_row_at_y(), and at least one row.
      const row = rows.findLast((r) => top(r) - top(rows[0]!) <= y);
      return row === cursor ? rows[at + count] : row;
    }
  }
  return undefined;
}

const TAB_STOPS = "a[href], button, input, select, textarea, [tabindex]";

/** Moves focus on from `from` like Tab or Shift+Tab: gtk_widget_child_focus() on the root. */
function tabFocus(from: HTMLElement, backward: boolean) {
  const stops = Array.from(from.ownerDocument.querySelectorAll<HTMLElement>(TAB_STOPS)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.matches(":disabled") &&
      !el.closest("[inert]") &&
      el.getClientRects().length > 0,
  );
  const next = backward
    ? stops.findLast(
        (el) =>
          !el.contains(from) &&
          !!(el.compareDocumentPosition(from) & Node.DOCUMENT_POSITION_FOLLOWING),
      )
    : stops.find((el) => !!(from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
  next?.focus();
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
    // is_single_line()
    const singleLine = !hasDescription && (!!headerSuffix || hasTitle);
    const titleId = useId();
    const descriptionId = useId();

    // Like adw_preferences_group_add(): rows go in the list and other widgets
    // below it. On the client every child is rendered below the list, and a
    // row portals itself into the list (useListBoxRow), so no child moves when
    // it turns out to be a row, or stops being one. The list exists from the
    // first render, so a parent that measures the group when it mounts, like a
    // dialog fixing its natural size, sees the rows in it.
    //
    // A server render can't portal: there the children render in the list, so
    // the rows are in place before and after hydration (useRowContainer).
    const boxRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const listClass = `gtk-list gtk-preferencesgroup-list ${separateRows ? "boxed-list-separate" : "boxed-list"}`;
    const { container, rendersList } = useRowContainer(boxRef, listRef, listClass);
    const rows = (
      <GtkListBoxRowContext.Provider value={container}>{children}</GtkListBoxRowContext.Provider>
    );
    useLayoutEffect(() => {
      // The list node, the server-rendered one too while hydrating (#134).
      const list = container.list ?? listRef.current;
      if (!list) return;

      // The list's move-cursor bindings, for keys pressed on a row. The cursor
      // can be on an insensitive row, which focus can't move to. Past either
      // end, keynav-failed moves focus on like Tab
      // (adw_tab_on_vertical_keynav_failed()).
      let cursor: HTMLElement | null = null;
      const rowsOf = () =>
        Array.from(list.children).filter(
          (r): r is HTMLElement => r instanceof HTMLElement && r.getClientRects().length > 0,
        );
      const onFocusIn = (e: FocusEvent) => {
        if (e.target instanceof HTMLElement && e.target.parentElement === list) cursor = e.target;
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.defaultPrevented || e.altKey || !(e.target instanceof HTMLElement)) return;
        const keys = ["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];
        const rows = rowsOf();
        const focused = e.target;
        if (!keys.includes(e.key) || !rows.includes(focused)) return;
        e.preventDefault();
        const from = cursor && rows.includes(cursor) && !canFocus(cursor) ? cursor : focused;
        const target = cursorRow(rows, from, e.key);
        if (!target || target === from) {
          tabFocus(focused, e.key === "ArrowUp" || e.key === "Home" || e.key === "PageUp");
          return;
        }
        cursor = target;
        if (canFocus(target)) target.focus();
      };
      list.addEventListener("focusin", onFocusIn);
      list.addEventListener("keydown", onKeyDown);
      return () => {
        list.removeEventListener("focusin", onFocusIn);
        list.removeEventListener("keydown", onKeyDown);
      };
    }, [container.list]);

    const classes = ["gtk-preferencesgroup"];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-describedby={hasDescription ? descriptionId : undefined}
        className={classes.join(" ")}
        {...rest}
      >
        {/* Spacing comes from the theme's border-spacing: 6px in this box and
            the labels box, none between the labels and the header suffix. */}
        <div className="gtk-box gtk-box-layout vertical">
          {hasHeader && (
            <div
              className={`gtk-box gtk-box-layout horizontal header ${singleLine ? "single-line" : ""}`}
            >
              {/* Only the labels are centered: the suffix fills the header's
                  height, as GtkWidget:valign defaults to fill. */}
              <div
                className="gtk-box gtk-box-layout vertical labels"
                data-valign="center"
                style={{ flex: 1 }}
              >
                {hasTitle && (
                  <span id={titleId} className="gtk-label heading h4" style={ELLIPSIZE_STYLE}>
                    <span style={ELLIPSIS_STYLE}>{labelText(title, true)}</span>
                  </span>
                )}
                {hasDescription && (
                  <span
                    id={descriptionId}
                    className="gtk-label body dimmed description"
                    style={wrapStyle("word-char")}
                  >
                    {labelText(description, true)}
                  </span>
                )}
              </div>
              <GtkListBoxRowContext.Provider value={null}>
                {headerSuffix}
              </GtkListBoxRowContext.Provider>
            </div>
          )}
          <div ref={boxRef} className="gtk-box gtk-box-layout vertical">
            {/* GTK hides the list while it has no rows: see .gtk-preferencesgroup-list. */}
            {rendersList && (
              <div ref={listRef} role="list" className={listClass}>
                {!container.list && rows}
              </div>
            )}
            {container.list && rows}
          </div>
        </div>
      </div>
    );
  },
);

// Like GtkLabel's ellipsize="end": the label's minimum width is next to
// nothing and its natural width the text's (a grid track from 0 to
// max-content), and its text block draws the ellipsis.
const ELLIPSIZE_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, max-content)",
};
const ELLIPSIS_STYLE: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "pre",
};
