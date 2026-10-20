import React, {
  Children,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FOCUSABLE } from "../focusable.ts";
import { alignAttrs, type GtkAlignProps, type GtkPositionType } from "../types.ts";
import { GtkImage } from "./image.tsx";
import { GtkLabel } from "./label.tsx";

export interface GtkNotebookPageProps {
  /** Tab label text. */
  tabLabel: string;
  /** Tab label widget (replaces tabLabel). */
  tabWidget?: ReactNode;
  /**
   * Whether this tab can be reordered, by dragging it or with Alt+arrow keys,
   * Alt+Home and Alt+End. The notebook reports the new position through
   * `onPageReordered`; the app reorders its pages. Default: false.
   */
  reorderable?: boolean;
  children: ReactNode;
}

/**
 * GtkNotebookPage — Declares a page in a GtkNotebook. Not rendered directly.
 */
export function GtkNotebookPage(_props: GtkNotebookPageProps): ReactElement | null {
  return null;
}

export interface GtkNotebookProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Current page index. Default: 0. */
  page?: number;
  /** Whether to show tabs. Default: true. */
  showTabs?: boolean;
  /** Whether to show a border. Default: true. */
  showBorder?: boolean;
  /** Whether tabs that don't fit are scrolled with arrow buttons. Default: false. */
  scrollable?: boolean;
  /** Tab position. Default: "top". */
  tabPos?: GtkPositionType;
  /** Callback when page changes. */
  onSwitchPage?: (pageIndex: number) => void;
  /**
   * Callback when the user moves a reorderable page (GtkNotebook::page-reordered).
   * The app reorders its pages; an uncontrolled notebook keeps the moved page current.
   */
  onPageReordered?: (fromIndex: number, toIndex: number) => void;
  children?: ReactNode;
}

type Direction = "up" | "down" | "left" | "right";

const ARROW_KEYS: Partial<Record<string, Direction>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** The direction a key has for a notebook with top tabs, like get_effective_direction(). */
const EFFECTIVE_DIRECTION: Record<GtkPositionType, Record<Direction, Direction>> = {
  top: { up: "up", down: "down", left: "left", right: "right" },
  bottom: { up: "down", down: "up", left: "left", right: "right" },
  left: { up: "left", down: "right", left: "up", right: "down" },
  right: { up: "left", down: "right", left: "down", right: "up" },
};

/** gtk-dnd-drag-threshold, as gtk_drag_check_threshold_double() uses it. */
const DRAG_THRESHOLD = 8;
/** The scroll arrows' auto-repeat: TIMEOUT_INITIAL, then TIMEOUT_REPEAT × SCROLL_DELAY_FACTOR. */
const ARROW_DELAY = 500;
const ARROW_REPEAT = 250;

type KeyInput = Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

/** What a key press in a notebook does. */
export type GtkNotebookKeyAction =
  | { page: number }
  | { reorder: number }
  | { focus: "page" }
  | { focus: "tabs"; always: boolean }
  | "consume"
  | null;

/**
 * The notebook's key bindings (gtk_notebook_class_init()) and arrow-key focus
 * moves (gtk_notebook_focus()), for a key pressed on the tabs (the focused
 * notebook) or inside the current page.
 */
export function notebookKeyAction(
  e: KeyInput,
  tabPos: GtkPositionType,
  onTabs: boolean,
  current: number,
  count: number,
  { reorderable = false } = {},
): GtkNotebookKeyAction {
  const { key, ctrlKey, altKey, shiftKey, metaKey } = e;
  const arrow = ARROW_KEYS[key];
  const dir = arrow && EFFECTIVE_DIRECTION[tabPos][arrow];
  const wrap = (i: number) => (i + count) % count;

  if (ctrlKey && !shiftKey && !metaKey && (key === "PageUp" || key === "PageDown")) {
    // change-current-page, from anywhere in the notebook; wraps around.
    return { page: wrap(current + (key === "PageUp" ? -1 : 1)) };
  }
  if (shiftKey || metaKey) return null;
  if (onTabs && altKey && !ctrlKey) {
    // reorder-tab: Alt+Left/Right move the current page a place, Alt+Home/End
    // to the first or last place.
    const toEnd = key === "End" || dir === "right";
    if (!reorderable || !(toEnd || key === "Home" || dir === "left")) return null;
    const to = key === "Home" ? 0 : key === "End" ? count - 1 : current + (toEnd ? 1 : -1);
    return to >= 0 && to < count && to !== current ? { reorder: to } : "consume";
  }
  if (altKey) return null;
  if (!onTabs) {
    // Back to the tabs (focus_tabs_in()): with Ctrl (move-focus-out), or when
    // Up leaves the page.
    return dir === "up" ? { focus: "tabs", always: ctrlKey } : null;
  }
  if (dir === "down") return { focus: "page" }; // focus_child_in(); with Ctrl, move-focus-out
  if (ctrlKey) return null;
  // focus_tabs_move(): the previous or next tab, wrapping around.
  if (dir === "left" || dir === "right") return { page: wrap(current + (dir === "left" ? -1 : 1)) };
  if (key === "Home" || key === "End") return { page: key === "Home" ? 0 : count - 1 }; // focus-tab
  if (key === " ") return "consume"; // select-page: the focused tab's page is already current
  return null;
}

/** The first element Tab would focus in `container`, like gtk_widget_child_focus(TAB_FORWARD). */
function firstTabbable(container: Element | null): HTMLElement | null {
  if (!container) return null;
  for (const el of container.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (el.tabIndex < 0 || el.matches(":disabled") || el.closest("[inert]")) continue;
    if (el.checkVisibility?.({ visibilityProperty: true }) === false) continue;
    return el;
  }
  return null;
}

/**
 * The tabs shown when they don't all fit, as an inclusive range around the
 * current one, like gtk_notebook_calculate_shown_tabs(): the previous first
 * tab stays while the current one fits after it; the space left goes to the
 * tabs after the current one and, once they all fit, to those before it.
 */
function shownTabs(sizes: number[], space: number, current: number, prevFirst: number) {
  const size = (i: number) => sizes[i] ?? 0;
  let remaining = space - size(current);
  if (remaining <= 0) return { first: current, last: current };
  let first = current;
  if (prevFirst < current) {
    while (first > prevFirst && remaining >= size(first - 1)) remaining -= size(--first);
    if (first > prevFirst) return { first, last: current };
  }
  let last = current;
  while (last + 1 < sizes.length && remaining >= size(last + 1)) remaining -= size(++last);
  if (last === sizes.length - 1) {
    while (first > 0 && remaining >= size(first - 1)) remaining -= size(--first);
  }
  return { first, last };
}

/**
 * GtkNotebook — A tabbed container widget.
 *
 * CSS node:
 *   notebook[.frame]
 *     ├── header[.top|.bottom|.left|.right]
 *     │   └── tabs
 *     │       ├── [arrow.down] (scrollable, when the tabs don't fit)
 *     │       ├── tab[:checked][.reorderable-page][.dnd] (per page)
 *     │       └── [arrow.up]
 *     └── stack (every page; the current one is visible)
 *
 * As in GTK, the notebook itself takes the keyboard focus for its tabs: the
 * arrow keys, Home and End switch pages, Down moves into the page and Up
 * comes back, and Ctrl+PageUp/PageDown switch pages from anywhere inside.
 *
 * @see https://docs.gtk.org/gtk4/class.Notebook.html
 */
export const GtkNotebook = forwardRef<HTMLDivElement, GtkNotebookProps>(function GtkNotebook(
  {
    page: controlledPage,
    showTabs = true,
    showBorder = true,
    scrollable = false,
    tabPos = "top",
    onSwitchPage,
    onPageReordered,
    children,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    onKeyDown,
    onMouseDown,
    ...rest
  },
  ref,
) {
  const isControlled = controlledPage !== undefined;
  const [internalPage, setInternalPage] = useState(0);
  const currentPage = isControlled ? controlledPage : internalPage;

  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);
  const id = useId();
  const tabId = (i: number) => `${id}-tab-${i}`;
  const pageId = (i: number) => `${id}-page-${i}`;

  // Extract pages from children
  const pages: GtkNotebookPageProps[] = [];
  Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === GtkNotebookPage) {
      pages.push(child.props as GtkNotebookPageProps);
    }
  });
  const count = pages.length;
  const vertical = tabPos === "left" || tabPos === "right";
  const hasTabs = showTabs && count > 0;

  // Like gtk_notebook_switch_page(), which does nothing for the current page.
  const switchPage = (index: number) => {
    if (index === currentPage || index < 0 || index >= count) return;
    if (!isControlled) setInternalPage(index);
    onSwitchPage?.(index);
  };

  // Like gtk_notebook_reorder_tab(): the moved page stays the current one.
  const reorderPage = (from: number, to: number) => {
    if (from === to) return;
    if (!isControlled && from === currentPage) setInternalPage(to);
    onPageReordered?.(from, to);
  };

  // For the arrows' repeat timer, which outlives the render it started in.
  const latest = useRef({ currentPage, count, switchPage });
  latest.current = { currentPage, count, switchPage };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !hasTabs) return;
    const root = e.currentTarget;
    const onTabs = e.target === root;
    const action = notebookKeyAction(e, tabPos, onTabs, currentPage, count, {
      reorderable: !!pages[currentPage]?.reorderable,
    });
    const page = document.getElementById(pageId(currentPage));
    let handled = action !== null;
    if (action === null || action === "consume") {
      // Nothing to do.
    } else if ("page" in action) {
      switchPage(action.page);
    } else if ("reorder" in action) {
      reorderPage(currentPage, action.reorder);
    } else if (action.focus === "page") {
      const target = firstTabbable(page);
      target?.focus();
      handled = target !== null;
    } else {
      // Plain Up leaves the page from its first focusable widget; a text view
      // keeps it for its cursor.
      const target = e.target as HTMLElement;
      handled =
        !!page?.contains(target) &&
        (action.always || (firstTabbable(page) === target && !target.matches("textarea")));
      if (handled) root.focus();
    }
    if (handled) e.preventDefault();
  };

  // GTK only takes the focus for the tabs: a press elsewhere in the notebook
  // mustn't focus it through its tabindex.
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(e);
    const target = e.target as Element;
    if (
      !e.defaultPrevented &&
      target.closest(FOCUSABLE) === e.currentTarget &&
      !tabsRef.current?.contains(target)
    ) {
      e.preventDefault();
    }
  };

  // Tabs switch on press, like gtk_notebook_gesture_pressed(), which focuses
  // the notebook (the browser does, as the tabs aren't focusable) and, when
  // the focus was elsewhere, the new page's first widget.
  const handleTabPointerDown = (e: PointerEvent<HTMLDivElement>, index: number) => {
    if (e.button !== 0) return;
    const wasFocus = document.activeElement === rootRef.current;
    const changed = index !== currentPage;
    switchPage(index);
    if (changed && !wasFocus) {
      setTimeout(() => firstTabbable(document.getElementById(pageId(index)))?.focus());
    }
    if (pages[index]?.reorderable) startDrag(e, index);
  };

  // --- Dragging a reorderable tab (gtk_notebook_motion(), gtk_notebook_stop_reorder()) ---
  const [dragging, setDragging] = useState<number | null>(null);

  const startDrag = (e: PointerEvent<HTMLDivElement>, from: number) => {
    const strip = tabsRef.current;
    if (!strip) return;
    const tab = e.currentTarget;
    const tabs = Array.from(strip.querySelectorAll<HTMLElement>(":scope > .gtk-tab"));
    const along = (x: number, y: number) => (vertical ? y : x);
    const span = (el: Element) => {
      const r = el.getBoundingClientRect();
      return vertical ? { start: r.top, size: r.height } : { start: r.left, size: r.width };
    };
    const translate = vertical ? "translateY" : "translateX";
    const { clientX: x0, clientY: y0, pointerId } = e;
    let active = false;
    let to = from;

    const move = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!active) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) <= DRAG_THRESHOLD) return;
        active = true;
        setDragging(from);
      }
      // The tab follows the pointer within the strip, and the tabs it passes
      // move over to make room for it (gtk_notebook_pages_allocate()).
      const self = span(tab);
      const area = span(strip);
      const s = getComputedStyle(tab);
      const before = parseFloat(vertical ? s.marginTop : s.marginLeft);
      const after = parseFloat(vertical ? s.marginBottom : s.marginRight);
      const offset = Math.min(
        Math.max(along(ev.clientX, ev.clientY) - along(x0, y0), area.start + before - self.start),
        area.start + area.size - after - self.size - self.start,
      );
      const center = self.start + offset + self.size / 2;
      to = from;
      tabs.forEach((t, i) => {
        if (t.hasAttribute("data-child-hidden")) return;
        const r = span(t);
        if (i > from && center > r.start + r.size / 2) to = i;
        if (i < from && center < r.start + r.size / 2 && to >= from) to = i;
      });
      const slot = self.size + before + after;
      tabs.forEach((t, i) => {
        const shift =
          i === from ? offset : i > from && i <= to ? -slot : i < from && i >= to ? slot : 0;
        t.style.transform = shift ? `${translate}(${shift}px)` : "";
      });
    };
    const end = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      for (const t of tabs) t.style.transform = "";
      if (!active) return;
      setDragging(null);
      if (ev.type === "pointerup") reorderPage(from, to);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  // --- Scrollable tabs (gtk_notebook_tab_space(), gtk_notebook_calculate_shown_tabs()) ---
  // When the tabs don't fit, the arrows show, and so do as many tabs around
  // the current one as fit between them, sharing out the space left.
  const [shown, setShown] = useState<{ first: number; last: number } | null>(null);
  const [resized, setResized] = useState(0);

  useLayoutEffect(() => {
    void resized;
    const strip = tabsRef.current;
    if (!scrollable || !strip || count === 0) {
      if (shown) setShown(null);
      return;
    }
    const outerSize = (el: HTMLElement) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return vertical
        ? r.height + parseFloat(s.marginTop) + parseFloat(s.marginBottom)
        : r.width + parseFloat(s.marginLeft) + parseFloat(s.marginRight);
    };
    const s = getComputedStyle(strip);
    const available = vertical
      ? strip.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)
      : strip.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    // The tabs' natural sizes (page->requisition), without the shared-out space.
    const sizes = Array.from(strip.querySelectorAll<HTMLElement>(":scope > .gtk-tab"), (tab) => {
      tab.style.flex = "none";
      const size = outerSize(tab);
      tab.style.flex = "";
      return size;
    });
    if (sizes.reduce((a, b) => a + b, 0) <= available) {
      if (shown) setShown(null);
      return;
    }
    const arrows = Array.from(strip.querySelectorAll<HTMLElement>(":scope > .gtk-arrow"));
    if (arrows.length === 0) {
      // Show the arrows first, to measure them.
      setShown({ first: 0, last: currentPage });
      return;
    }
    const space = available - arrows.reduce((a, el) => a + outerSize(el), 0);
    const next = shownTabs(sizes, space, Math.min(currentPage, count - 1), shown?.first ?? 0);
    if (next.first !== shown?.first || next.last !== shown?.last) setShown(next);
  });

  useEffect(() => {
    const strip = tabsRef.current;
    if (!scrollable || !strip) return;
    const observer = new ResizeObserver(() => setResized((n) => n + 1));
    observer.observe(strip);
    return () => observer.disconnect();
  }, [scrollable]);

  // gtk_notebook_arrow_button_press(): a page per press, repeating while held.
  const arrowTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stopArrow = () => clearTimeout(arrowTimer.current);
  useEffect(() => stopArrow, []);

  const pressArrow = (e: MouseEvent<HTMLButtonElement>, step: number) => {
    if (e.button !== 0) return;
    // gtk_notebook_do_arrow() stops at the first and last pages.
    const doArrow = () => {
      const { currentPage: page, count: n, switchPage: go } = latest.current;
      if (page + step < 0 || page + step >= n) return false;
      go(page + step);
      return true;
    };
    stopArrow();
    const repeat = (delay: number) => {
      arrowTimer.current = setTimeout(() => {
        if (doArrow()) repeat(ARROW_REPEAT);
      }, delay);
    };
    if (doArrow()) repeat(ARROW_DELAY);
  };

  const showArrows = scrollable && shown !== null;
  // Like update_arrow_nodes(): insensitive at the ends (update_arrow_state()).
  const arrow = (step: -1 | 1) => (
    <button
      type="button"
      className={`gtk-arrow image-button ${step < 0 ? "down" : "up"}`}
      aria-label={step < 0 ? "Previous tab" : "Next tab"}
      tabIndex={-1}
      disabled={step < 0 ? currentPage <= 0 : currentPage >= count - 1}
      // The press focuses the notebook; passing the arrow's mouse focus on keeps
      // it from showing a focus ring.
      onFocus={() => rootRef.current?.focus()}
      onMouseDown={(e) => pressArrow(e, step)}
      onMouseUp={stopArrow}
      onMouseLeave={stopArrow}
    >
      <GtkImage
        iconName={`Pan${vertical ? (step < 0 ? "Up" : "Down") : step < 0 ? "Start" : "End"}`}
      />
    </button>
  );

  // A BoxLayout, horizontal for side tabs (gtk_notebook_update_tab_pos()).
  const classes = ["gtk-notebook", "gtk-box-layout", vertical ? "horizontal" : "vertical"];
  if (showBorder) classes.push("frame");
  if (className) classes.push(className);

  // The header is a GtkBox along the tabs, which expand along it. Neither
  // counts for the notebook's expand (gtk_notebook_compute_expand()).
  const header = showTabs && (
    <div
      className={`gtk-header ${tabPos} gtk-box-layout ${vertical ? "vertical" : "horizontal"}`}
      {...alignAttrs(undefined, undefined, !vertical, vertical)}
      data-expand-ignored
    >
      <div
        ref={tabsRef}
        className="gtk-tabs"
        {...alignAttrs(undefined, undefined, !vertical, vertical)}
        role="tablist"
        aria-orientation={vertical ? "vertical" : "horizontal"}
        data-scrollable={scrollable || undefined}
        data-arrows={showArrows || undefined}
      >
        {showArrows && arrow(-1)}
        {pages.map((page, i) => {
          const tabClasses = ["gtk-tab"];
          if (page.reorderable) tabClasses.push("reorderable-page");
          if (dragging === i) tabClasses.push("dnd");
          return (
            <div
              key={i}
              id={tabId(i)}
              className={tabClasses.join(" ")}
              role="tab"
              aria-selected={i === currentPage}
              aria-controls={pageId(i)}
              data-checked={i === currentPage || undefined}
              data-child-hidden={(showArrows && (i < shown.first || i > shown.last)) || undefined}
              onPointerDown={(e) => handleTabPointerDown(e, i)}
            >
              {/* gtk_notebook_set_tab_label_text() makes a GtkLabel */}
              {page.tabWidget ?? <GtkLabel label={page.tabLabel} />}
            </div>
          );
        })}
        {showArrows && arrow(1)}
      </div>
    </div>
  );

  // The stack holds every page, so they keep their state and the notebook is
  // as large as its largest page (a homogeneous GtkStack).
  const content = (
    <div className="gtk-stack">
      {pages.map((page, i) => (
        <div
          key={i}
          id={pageId(i)}
          role="tabpanel"
          aria-labelledby={showTabs ? tabId(i) : undefined}
          data-current={i === currentPage || undefined}
          inert={i !== currentPage || undefined}
        >
          {page.children}
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={classes.join(" ")}
      role="group"
      // The notebook takes the focus for its tabs (gtk_notebook_grab_focus()).
      tabIndex={hasTabs ? 0 : undefined}
      aria-activedescendant={hasTabs ? tabId(currentPage) : undefined}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
    >
      {(tabPos === "top" || tabPos === "left") && header}
      {content}
      {(tabPos === "bottom" || tabPos === "right") && header}
    </div>
  );
});
