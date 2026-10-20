import { isCoveredByLayer } from "@gtk-js/gtk4";
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { animateSpring, type SpringAnimationHandle, type SpringParams } from "../spring.ts";
import type { AdwLengthUnit } from "../types.ts";

export interface AdwOverlaySplitViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  /** The content widget. */
  content?: ReactNode;
  /** The sidebar widget. */
  sidebar?: ReactNode;
  /** Whether the sidebar is shown as an overlay above the content instead of beside it. Default: false. */
  collapsed?: boolean;
  /**
   * Whether the sidebar is shown. When set, the view is controlled and asks
   * for changes through `onShowSidebarChanged`; otherwise it keeps the value
   * itself, starting with the sidebar shown unless collapsed.
   */
  showSidebar?: boolean;
  /**
   * Called when the view shows or hides the sidebar: when `collapsed`
   * changes (unless `pinSidebar`), and on a click on the dimmed content,
   * Escape or a touchscreen swipe.
   */
  onShowSidebarChanged?: (show: boolean) => void;
  /** Whether changing `collapsed` leaves the sidebar's visibility alone. Default: false. */
  pinSidebar?: boolean;
  /** Whether the sidebar is before or after the content. Default: "start". */
  sidebarPosition?: "start" | "end";
  /** Preferred sidebar width as a fraction of the view's width, when not collapsed. Default: 0.25. */
  sidebarWidthFraction?: number;
  /** Minimum sidebar width. Default: 180. */
  minSidebarWidth?: number;
  /** Maximum sidebar width. Default: 280. */
  maxSidebarWidth?: number;
  /** Length unit of `minSidebarWidth` and `maxSidebarWidth`. Default: "sp". */
  sidebarWidthUnit?: AdwLengthUnit;
  /** Whether a touchscreen swipe from the sidebar's edge shows it. Default: true. */
  enableShowGesture?: boolean;
  /** Whether a touchscreen swipe on the sidebar hides it. Default: true. */
  enableHideGesture?: boolean;
}

/** The show/hide spring: `adw_spring_params_new (1, 0.5, 500)`. */
const SIDEBAR_SPRING: SpringParams = { dampingRatio: 1, mass: 0.5, stiffness: 500 };

// AdwSwipeTracker (adw-swipe-tracker.c, adw-swipe-tracker-private.h).
const SWIPE_BORDER = 32;
const DRAG_THRESHOLD_DISTANCE = 16;
const VELOCITY_THRESHOLD_TOUCH = 0.3; // px/ms
const EVENT_HISTORY_THRESHOLD_MS = 150;

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';

/**
 * Like gtk_widget_grab_focus() on the pane's last focused widget, else
 * gtk_widget_child_focus (pane, GTK_DIR_TAB_FORWARD).
 */
function focusPane(pane: HTMLElement, last: HTMLElement | null) {
  const candidates = last?.isConnected && pane.contains(last) ? [last] : [];
  for (const el of pane.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (el.tabIndex >= 0 && !el.matches(":disabled")) candidates.push(el);
  }
  for (const el of candidates) {
    el.focus();
    if (document.activeElement === el) return;
  }
}

interface Swipe {
  id: number;
  x: number;
  y: number;
  prevOffset: number;
  state: "pending" | "swiping" | "rejected";
  /** Whether prepare_cb() accepted it; otherwise the swipe is claimed but does nothing. */
  detected: boolean;
  progress: number;
  history: { delta: number; time: number }[];
}

/**
 * AdwOverlaySplitView — A split view with collapsible overlay sidebar.
 *
 * Sidebar and content sit side by side; when collapsed, the sidebar overlays
 * the content, which is dimmed, with a shadow along the sidebar's edge.
 * Showing and hiding slides the sidebar in and out with a spring (damping 1,
 * mass 0.5, stiffness 500). Both panes stay mounted, so their state survives
 * collapsing and hiding.
 *
 * CSS node:
 *   overlay-split-view
 *     ├── dimming.left|.right   (collapsed, while the sidebar is shown)
 *     ├── shadow.left|.right
 *     ├── border.left|.right
 *     ├── widget[.content-pane]
 *     ├── widget                (collapsed, while the sidebar is shown: a click hides it)
 *     └── widget[.sidebar-pane|.background][.end]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.OverlaySplitView.html
 * @see upstream/libadwaita/src/adw-overlay-split-view.c
 */
export const AdwOverlaySplitView = forwardRef<HTMLDivElement, AdwOverlaySplitViewProps>(
  function AdwOverlaySplitView(
    {
      content,
      sidebar,
      collapsed = false,
      showSidebar,
      onShowSidebarChanged,
      pinSidebar = false,
      sidebarPosition = "start",
      sidebarWidthFraction = 0.25,
      minSidebarWidth = 180,
      maxSidebarWidth = 280,
      sidebarWidthUnit = "sp",
      enableShowGesture = true,
      enableHideGesture = true,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const isControlled = showSidebar !== undefined;
    // Collapsing hides the sidebar and uncollapsing shows it, unless pinned
    // (adw_overlay_split_view_set_collapsed()).
    const [internalShow, setInternalShow] = useState(() => pinSidebar || !collapsed);
    const [prevCollapsed, setPrevCollapsed] = useState(collapsed);
    if (prevCollapsed !== collapsed) {
      setPrevCollapsed(collapsed);
      if (!pinSidebar) setInternalShow(!collapsed);
    }
    const show = isControlled ? showSidebar : internalShow;

    // The sidebar's child-visible: set as soon as it's shown, cleared once
    // hiding it has finished (animation_done_cb()).
    const [mapped, setMapped] = useState(show);
    if (show && !mapped) setMapped(true);

    // get_start_or_end(): which side the sidebar is on depends on the direction.
    const [rtl, setRtl] = useState(false);
    const start = sidebarPosition === "start";
    const left = start !== rtl;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const sidebarRef = useRef<HTMLDivElement | null>(null);
    const dimmingRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);
    const borderRef = useRef<HTMLDivElement | null>(null);
    const progressRef = useRef(show ? 1 : 0);
    const animationRef = useRef<SpringAnimationHandle | null>(null);
    const animationTargetRef = useRef<number | null>(null);
    const velocityRef = useRef(0);
    const lastSidebarFocus = useRef<HTMLElement | null>(null);
    const lastContentFocus = useRef<HTMLElement | null>(null);

    const current = {
      collapsed,
      start,
      left,
      show,
      isControlled,
      onShowSidebarChanged,
      enableShowGesture,
      enableHideGesture,
    };
    const latest = useRef(current);
    latest.current = current;

    const commitRef = useRef(0);
    useLayoutEffect(() => {
      commitRef.current += 1;
    });

    // Places the sidebar and the shadow helper's nodes for the current show
    // progress, like allocate_uncollapsed() / allocate_collapsed(). Written
    // directly, so animation frames don't re-render the panes.
    const apply = useCallback(() => {
      const root = rootRef.current;
      const pane = sidebarRef.current;
      if (!root || !pane) return;
      const { collapsed, start } = latest.current;
      const progress = Math.min(Math.max(progressRef.current, 0), 1);
      const width = pane.getBoundingClientRect().width;
      const offset = Math.trunc(width * progress);
      const place = (el: HTMLElement | null, prop: "margin" | "inset", value: string) => {
        el?.style.setProperty(`${prop}-inline-start`, start ? value : "");
        el?.style.setProperty(`${prop}-inline-end`, start ? "" : value);
      };
      place(pane, collapsed ? "margin" : "inset", "");
      place(pane, collapsed ? "inset" : "margin", `${offset - width}px`);
      if (!collapsed) return;
      // adw_shadow_helper_size_allocate() at progress 1 - show progress.
      for (const el of [dimmingRef.current, shadowRef.current, borderRef.current]) {
        place(el, "inset", `${offset}px`);
      }
      const dimming = dimmingRef.current;
      if (dimming) dimming.style.opacity = String(progress);
      const shadow = shadowRef.current;
      if (shadow) {
        const remaining = progress * root.clientWidth;
        const size = shadow.offsetWidth;
        shadow.style.opacity = String(remaining < size ? remaining / size : 1);
      }
    }, []);

    const stopAnimation = useCallback(() => {
      animationRef.current?.cancel();
      animationRef.current = null;
      animationTargetRef.current = null;
    }, []);

    // animate_sidebar()
    const animateTo = useCallback(
      (to: number, velocity = 0) => {
        // A swipe may have started this animation already.
        if (animationRef.current && animationTargetRef.current === to) return;
        stopAnimation();
        const done = () => {
          animationRef.current = null;
          animationTargetRef.current = null;
          if (progressRef.current < 0.5) setMapped(false);
        };
        if (progressRef.current === to) {
          done();
          return;
        }
        animationTargetRef.current = to;
        animationRef.current = animateSpring({
          params: SIDEBAR_SPRING,
          from: progressRef.current,
          to,
          initialVelocity: velocity,
          clamp: to < 0.5,
          onValue: (value) => {
            progressRef.current = value;
            apply();
          },
          onDone: done,
        });
      },
      [apply, stopAnimation],
    );

    const requestShow = useCallback((value: boolean, velocity = 0) => {
      const { show, isControlled, onShowSidebarChanged } = latest.current;
      if (value === show) return;
      velocityRef.current = velocity;
      if (!isControlled) setInternalShow(value);
      onShowSidebarChanged?.(value);
    }, []);

    // set_collapsed() calls set_show_sidebar (self, !collapsed, FALSE, 0):
    // the sidebar jumps to its new state without animating, in this commit
    // when uncontrolled, or the next one when the parent follows the callback.
    const committedCollapsed = useRef(collapsed);
    const committedShow = useRef(show);
    const snapRef = useRef<{ show: boolean; commit: number } | null>(null);
    useLayoutEffect(() => {
      if (committedCollapsed.current === collapsed) return;
      committedCollapsed.current = collapsed;
      if (pinSidebar) return;
      snapRef.current = { show: !collapsed, commit: commitRef.current };
      if (committedShow.current === collapsed) latest.current.onShowSidebarChanged?.(!collapsed);
    }, [collapsed, pinSidebar]);

    useLayoutEffect(() => {
      if (committedShow.current === show) return;
      committedShow.current = show;
      // Hiding the sidebar moves the focus out of it, and showing it over the
      // content moves the focus into it (set_show_sidebar()).
      const focus = document.activeElement;
      const sidebarPane = sidebarRef.current;
      const contentPane = contentRef.current;
      if (focus instanceof HTMLElement && sidebarPane && contentPane) {
        if (!show && sidebarPane.contains(focus)) {
          lastSidebarFocus.current = focus;
          focusPane(contentPane, lastContentFocus.current);
        } else if (show && collapsed && contentPane.contains(focus)) {
          lastContentFocus.current = focus;
          focusPane(sidebarPane, lastSidebarFocus.current);
        }
      }
      const snap = snapRef.current;
      snapRef.current = null;
      if (snap && snap.show === show && commitRef.current - snap.commit <= 1) {
        stopAnimation();
        progressRef.current = show ? 1 : 0;
        if (!show) setMapped(false);
      } else {
        animateTo(show ? 1 : 0, velocityRef.current);
      }
      velocityRef.current = 0;
    }, [show, collapsed, animateTo, stopAnimation]);

    useLayoutEffect(() => {
      const root = rootRef.current;
      if (root) {
        const isRtl = getComputedStyle(root).direction === "rtl";
        if (isRtl !== rtl) setRtl(isRtl);
      }
      apply();
    });

    useLayoutEffect(() => {
      const root = rootRef.current;
      const pane = sidebarRef.current;
      if (!root || !pane || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => apply());
      observer.observe(root);
      observer.observe(pane);
      return () => observer.disconnect();
    }, [apply]);

    useEffect(() => stopAnimation, [stopAnimation]);

    // Escape hides the overlaid sidebar wherever the focus is, unless
    // something handled it first: a GTK_SHORTCUT_SCOPE_MANAGED shortcut
    // (escape_shortcut_cb()).
    const overlaid = collapsed && mapped;
    useEffect(() => {
      if (!overlaid) return;
      const onKeyDown = (e: KeyboardEvent) => {
        const root = rootRef.current;
        if (e.key !== "Escape" || e.defaultPrevented || progressRef.current <= 0) return;
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
        if (!root || isCoveredByLayer(root)) return;
        e.preventDefault();
        requestShow(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [overlaid, requestShow]);

    // Touchscreen swipes (AdwSwipeTracker): from the sidebar's edge to show
    // it, on the sidebar to hide it. Touch events rather than touch-action,
    // so horizontal drags elsewhere still scroll what's under them.
    const gestures = enableShowGesture || enableHideGesture;
    useEffect(() => {
      const root = rootRef.current;
      if (!root || !gestures) return;
      let swipe: Swipe | null = null;

      const sidebarWidth = () => sidebarRef.current?.getBoundingClientRect().width || 1;
      // adw_overlay_split_view_get_swipe_area()
      const inSwipeArea = (x: number) => {
        const rect = root.getBoundingClientRect();
        const area = Math.max(Math.trunc(sidebarWidth() * progressRef.current), SWIPE_BORDER);
        return latest.current.left
          ? x >= rect.left && x < rect.left + area
          : x >= rect.right - area && x < rect.right;
      };
      const touchOf = (e: TouchEvent) =>
        Array.from(e.changedTouches).find((t) => t.identifier === swipe?.id);
      const trimHistory = (s: Swipe, time: number) => {
        s.history = s.history.filter((r) => r.time >= time - EVENT_HISTORY_THRESHOLD_MS);
      };

      const onStart = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        if (swipe || !t || e.touches.length !== 1) return;
        swipe = {
          id: t.identifier,
          x: t.clientX,
          y: t.clientY,
          prevOffset: 0,
          state: "pending",
          detected: false,
          progress: 0,
          history: [],
        };
      };

      const onMove = (e: TouchEvent) => {
        const t = touchOf(e);
        if (!swipe || !t || swipe.state === "rejected") return;
        const { left, collapsed, enableShowGesture, enableHideGesture } = latest.current;
        const dx = t.clientX - swipe.x;
        const dy = t.clientY - swipe.y;
        // The swipe tracker is reversed when the sidebar is on the left.
        const offset = left ? dx : -dx;
        const delta = offset - swipe.prevOffset;
        swipe.prevOffset = offset;
        swipe.history.push({ delta, time: e.timeStamp });
        trimHistory(swipe, e.timeStamp);

        if (swipe.state === "pending") {
          if (Math.abs(dy) > Math.abs(dx)) {
            swipe.state = "rejected";
            return;
          }
          // Keep the page from scrolling sideways under what may be a swipe.
          if (inSwipeArea(swipe.x)) e.preventDefault();
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_DISTANCE) return;
          const progress = progressRef.current;
          if ((!inSwipeArea(swipe.x) && !inSwipeArea(t.clientX)) || (offset < 0 && progress <= 0)) {
            swipe.state = "rejected";
            return;
          }
          // prepare_cb() and begin_swipe_cb()
          swipe.detected = !(
            (progress >= 1 && !collapsed && offset > 0) ||
            (progress <= 0 && !enableShowGesture) ||
            (progress >= 1 && !enableHideGesture)
          );
          swipe.state = "swiping";
          swipe.progress = progress;
          if (swipe.detected) {
            stopAnimation();
            setMapped(true);
          }
        }

        e.preventDefault();
        if (!swipe.detected) return;
        swipe.progress = Math.min(Math.max(swipe.progress + delta / sidebarWidth(), 0), 1);
        progressRef.current = swipe.progress;
        apply();
      };

      const finish = (e: TouchEvent, cancelled: boolean) => {
        const ended = swipe;
        if (!ended || !touchOf(e)) return;
        swipe = null;
        if (ended.state !== "swiping" || !ended.detected) return;
        // calculate_velocity() and get_end_progress()
        trimHistory(ended, e.timeStamp);
        const first = ended.history[0];
        const last = ended.history[ended.history.length - 1];
        let velocity = 0;
        if (first && last && last.time > first.time) {
          const total = ended.history.slice(1).reduce((sum, r) => sum + r.delta, 0);
          velocity = total / (last.time - first.time);
        }
        if ((ended.progress <= 0 && velocity < 0) || (ended.progress >= 1 && velocity > 0)) {
          velocity = 0;
        }
        let to = Math.round(ended.progress);
        if (!cancelled && Math.abs(velocity) >= VELOCITY_THRESHOLD_TOUCH) to = velocity > 0 ? 1 : 0;
        // end_swipe_cb()
        const springVelocity = velocity / sidebarWidth();
        animateTo(to, springVelocity);
        requestShow(to > 0, springVelocity);
      };
      const onEnd = (e: TouchEvent) => finish(e, false);
      const onCancel = (e: TouchEvent) => finish(e, true);

      root.addEventListener("touchstart", onStart, { passive: true });
      root.addEventListener("touchmove", onMove, { passive: false });
      root.addEventListener("touchend", onEnd);
      root.addEventListener("touchcancel", onCancel);
      return () => {
        root.removeEventListener("touchstart", onStart);
        root.removeEventListener("touchmove", onMove);
        root.removeEventListener("touchend", onEnd);
        root.removeEventListener("touchcancel", onCancel);
      };
    }, [gestures, apply, animateTo, requestShow, stopAnimation]);

    // adw_length_unit_to_px() at the default text scale, rounded up like
    // get_sidebar_width().
    const toPx = (value: number) =>
      Math.ceil(sidebarWidthUnit === "pt" ? (value * 96) / 72 : value);
    const minWidth = toPx(minSidebarWidth);
    const maxWidth = Math.max(minWidth, toPx(maxSidebarWidth));
    const side = left ? "left" : "right";

    const setRef = (el: HTMLDivElement | null) => {
      rootRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    const classes = ["gtk-overlay-split-view"];
    if (className) classes.push(className);

    const sidebarClasses = [
      "gtk-widget",
      "gtk-bin-layout",
      collapsed ? "background" : "sidebar-pane",
    ];
    if (!start) sidebarClasses.push("end");

    // The shadow helper's gizmos, drawn over the content along the sidebar's
    // edge; the pointer goes through them.
    const helperStyle: CSSProperties = {
      position: "absolute",
      top: 0,
      bottom: 0,
      zIndex: 2,
      pointerEvents: "none",
      display: overlaid ? undefined : "none",
    };

    return (
      <div
        ref={setRef}
        className={classes.join(" ")}
        role="group"
        style={
          {
            position: "relative",
            display: "flex",
            overflow: "hidden",
            isolation: "isolate",
            "--gtk-min-sidebar-width": `${minWidth}px`,
            ...style,
          } as CSSProperties
        }
        {...rest}
      >
        <div
          ref={dimmingRef}
          className={`gtk-dimming ${side}`}
          aria-hidden
          style={{ ...helperStyle, width: "100%" }}
        />
        <div ref={shadowRef} className={`gtk-shadow ${side}`} aria-hidden style={helperStyle} />
        <div ref={borderRef} className={`gtk-border ${side}`} aria-hidden style={helperStyle} />
        <div
          ref={contentRef}
          className={`gtk-widget gtk-bin-layout${collapsed ? "" : " content-pane"}`}
          // The content can't take the focus while the sidebar covers it.
          inert={collapsed && show ? true : undefined}
          style={{ flex: "1 1 0", isolation: "isolate" }}
        >
          {content}
        </div>
        {/* The shield: a click on the dimmed content hides the sidebar. */}
        <div
          className="gtk-widget"
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            display: overlaid ? undefined : "none",
          }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => requestShow(false)}
        />
        <div
          ref={sidebarRef}
          className={sidebarClasses.join(" ")}
          inert={!mapped || (collapsed && !show) ? true : undefined}
          style={{
            // get_sidebar_width(): a fraction of the view's width, or all of
            // it when collapsed, between the minimum and maximum widths, and
            // at least the child's minimum width (see layout.css).
            width: collapsed
              ? `clamp(${minWidth}px, 100%, ${maxWidth}px)`
              : `clamp(${minWidth}px, round(down, ${sidebarWidthFraction * 100}%, 1px), ${maxWidth}px)`,
            minWidth: "min-content",
            maxWidth,
            visibility: mapped ? undefined : "hidden",
            ...(collapsed
              ? { position: "absolute", top: 0, bottom: 0, zIndex: 1 }
              : { flex: "0 1 auto", order: start ? -1 : undefined, isolation: "isolate" }),
          }}
        >
          {sidebar}
        </div>
      </div>
    );
  },
);
