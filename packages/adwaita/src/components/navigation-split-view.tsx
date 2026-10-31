import { isCoveredByLayer } from "@gtk-js/gtk4";
import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { animateSpring, NAVIGATION_SPRING, type SpringAnimationHandle } from "../spring.ts";
import type { AdwLengthUnit } from "../types.ts";
import { HeaderBarTitleContext } from "./header-bar-title.ts";
import {
  type AdwNavigationPageProps,
  NavContext,
  type NavigationContextValue,
} from "./navigation-view.tsx";
import {
  SplitViewTitleButtonsContext,
  useSplitViewPaneTitleButtons,
} from "./split-view-title-buttons.ts";

// Re-export the page props type for consumers
export type { AdwNavigationPageProps };

export interface AdwNavigationSplitViewProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  /** Sidebar pane. Must be a NavigationPage. */
  sidebar: AdwNavigationPageProps;
  /** Content pane. Must be a NavigationPage. */
  content: AdwNavigationPageProps;
  /** Whether the view is collapsed to single-pane mode. Default: false. */
  collapsed?: boolean;
  /**
   * Whether the content is shown rather than the sidebar when collapsed. It
   * is kept while uncollapsed, where `navigation.push` of the content's tag
   * sets it too. Default: false.
   */
  showContent?: boolean;
  /** Which side the sidebar is on. Default: "start". */
  sidebarPosition?: "start" | "end";
  /** Sidebar width as fraction of total width. Default: 0.25. */
  sidebarWidthFraction?: number;
  /** Minimum sidebar width. Default: 180. */
  minSidebarWidth?: number;
  /** Maximum sidebar width. Default: 280. */
  maxSidebarWidth?: number;
  /** Unit of `minSidebarWidth` and `maxSidebarWidth`. Default: "sp". */
  sidebarWidthUnit?: AdwLengthUnit;
  /** Fires when navigation changes which pane is shown. */
  onShowContentChanged?: (showContent: boolean) => void;
}

type Pane = "sidebar" | "content";

interface Transition {
  key: number;
  pop: boolean;
  /** The page sliding in or out over the other one. */
  moving: Pane;
}

/**
 * AdwNavigationSplitView — A split view that adapts between side-by-side
 * and stack-based navigation.
 *
 * Uncollapsed, the panes are side by side. Collapsed, they are the pages of
 * a navigation view: the sidebar is the root page and the content is pushed
 * over it (the other way around with the sidebar at the end), with the same
 * transitions and back buttons as AdwNavigationView.
 *
 * Like upstream, which reparents the same page widgets when collapsing
 * (update_collapsed()), the pages keep their state and focus across it:
 * both modes render the same element tree, with the elements that only one
 * mode has as `display: contents`.
 *
 * CSS nodes:
 *   navigation-split-view
 *     ├── widget.sidebar-pane[.end] ── navigation-view-page   (uncollapsed)
 *     ├── widget.content-pane ── navigation-view-page
 *     ╰── navigation-view                                      (collapsed)
 *           ├── navigation-view-page…
 *           ├── dimming
 *           ╰── shadow
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.NavigationSplitView.html
 * @see upstream/libadwaita/src/adw-navigation-split-view.c
 */
export const AdwNavigationSplitView = forwardRef<HTMLDivElement, AdwNavigationSplitViewProps>(
  function AdwNavigationSplitView(
    {
      sidebar,
      content,
      collapsed = false,
      showContent = false,
      sidebarPosition = "start",
      sidebarWidthFraction = 0.25,
      minSidebarWidth = 180,
      maxSidebarWidth = 280,
      sidebarWidthUnit = "sp",
      onShowContentChanged,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const parentNav = useContext(NavContext);
    const start = sidebarPosition !== "end";

    // show-content is the split view's own, so it outlives collapsing, which
    // rebuilds the stack from it (update_navigation_stack()).
    const [show, setShowState] = useState(showContent);
    const [showProp, setShowProp] = useState(showContent);
    if (showProp !== showContent) {
      setShowProp(showContent);
      setShowState(showContent);
    }
    const showRef = useRef(show);
    showRef.current = show;
    const onShowContentChangedRef = useRef(onShowContentChanged);
    onShowContentChangedRef.current = onShowContentChanged;
    const setShow = useCallback((next: boolean) => {
      if (showRef.current === next) return;
      showRef.current = next;
      setShowState(next);
      onShowContentChangedRef.current?.(next);
    }, []);

    // Collapsed, the root page and the page pushed over it.
    const rootPane: Pane = start ? "sidebar" : "content";
    const topPane: Pane = start ? "content" : "sidebar";
    const pushed = start ? show : !show;
    const visiblePane: Pane = pushed ? topPane : rootPane;
    const pageOf = (pane: Pane) => (pane === "sidebar" ? sidebar : content);

    // navigation.push / navigation.pop: the collapsed view's for its pages,
    // else the split view's (navigation_push_cb(), navigation_pop_cb()), else
    // the enclosing view's.
    const push = useCallback(
      (tag: string) => {
        if (tag !== content.tag && tag !== sidebar.tag) {
          parentNav.push(tag);
          return;
        }
        // A page already on the stack isn't pushed again.
        const pane: Pane = tag === content.tag ? "content" : "sidebar";
        if (collapsed ? pane === topPane : pane === "content") setShow(pane === "content");
      },
      [content.tag, sidebar.tag, parentNav, collapsed, topPane, setShow],
    );

    const pop = useCallback((): boolean => {
      const shown = showRef.current;
      if (collapsed && (start ? shown : !shown)) {
        setShow(!shown);
        return true;
      }
      if (shown) {
        setShow(false);
        return true;
      }
      return parentNav.pop();
    }, [collapsed, start, parentNav, setShow]);

    // Collapsed, the top page goes back to the root page, and the root page
    // (like both panes when uncollapsed) to the enclosing view's page.
    const sidebarCanPop = sidebar.canPop;
    const contentCanPop = content.canPop;
    const rootTitle = pageOf(rootPane).title;
    const contexts = useMemo(() => {
      const contextFor = (pane: Pane): NavigationContextValue => {
        const canPop = (pane === "sidebar" ? sidebarCanPop : contentCanPop) !== false;
        if (collapsed && pane === topPane) {
          return { push, pop, canPop, previousTitle: rootTitle };
        }
        return { ...parentNav, push, pop, canPop: canPop && parentNav.canPop };
      };
      return { sidebar: contextFor("sidebar"), content: contextFor("content") };
    }, [collapsed, topPane, push, pop, parentNav, sidebarCanPop, contentCanPop, rootTitle]);

    // Uncollapsed, each pane's header bars hide the window buttons facing
    // the other pane (update_start_title_buttons(), adw-header-bar.c).
    const sidebarTitleButtons = useSplitViewPaneTitleButtons(
      !collapsed && !start,
      !collapsed && start,
    );
    const contentTitleButtons = useSplitViewPaneTitleButtons(
      !collapsed && start,
      !collapsed && !start,
    );

    // --- transitions -------------------------------------------------------

    const [transition, setTransition] = useState<Transition | null>(null);
    const animationRef = useRef<SpringAnimationHandle | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<HTMLDivElement | null>(null);
    const pageRefs = useRef<Partial<Record<Pane, HTMLDivElement>>>({});
    const dimmingRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);
    const focusWasInside = useRef(false);

    // Only showing or hiding the content animates (set_show_content()):
    // collapsing or moving the sidebar replaces the view's stack.
    const [prev, setPrev] = useState({ collapsed, start, pushed });
    if (prev.collapsed !== collapsed || prev.start !== start || prev.pushed !== pushed) {
      setPrev({ collapsed, start, pushed });
      focusWasInside.current =
        typeof document !== "undefined" && !!rootRef.current?.contains(document.activeElement);
      setTransition(
        collapsed && prev.collapsed && prev.start === start
          ? { key: (transition?.key ?? 0) + 1, pop: !pushed, moving: topPane }
          : null,
      );
    }

    // When the focused widget's page gets hidden, focus moves to the page
    // being shown, so the view's shortcuts keep working. Otherwise it stays
    // where it was, as update_collapsed() grabs it back.
    useLayoutEffect(() => {
      if (!focusWasInside.current) return;
      focusWasInside.current = false;
      const active = document.activeElement;
      if (active && active !== document.body && !active.closest("[inert]")) return;
      pageRefs.current[visiblePane]?.focus({ preventScroll: true });
    }, [visiblePane, collapsed]);

    // Drive the active transition like AdwNavigationView, writing styles
    // directly to avoid re-rendering page contents on every frame.
    useLayoutEffect(() => {
      if (!transition) return;
      const view = viewRef.current;
      const moving = pageRefs.current[transition.moving];
      const staticPage = pageRefs.current[transition.moving === "sidebar" ? "content" : "sidebar"];
      const dimming = dimmingRef.current;
      const shadow = shadowRef.current;
      if (!view || !moving) return;
      const rtl = getComputedStyle(view).direction === "rtl";
      for (const el of [dimming, shadow]) {
        el?.classList.toggle("left", rtl);
        el?.classList.toggle("right", !rtl);
      }
      const width = view.clientWidth;
      const shadowSize = shadow?.offsetWidth || 56;

      const apply = (value: number) => {
        // Same convention as adw_navigation_view_size_allocate().
        const progress = transition.pop ? value : 1 - value;
        const offset = Math.round(progress * width);
        moving.style.transform = `translateX(${rtl ? -offset : offset}px)`;
        if (staticPage) {
          const hidden = Math.max(0, width - offset);
          staticPage.style.clipPath = rtl ? `inset(0 0 0 ${hidden}px)` : `inset(0 ${hidden}px 0 0)`;
        }
        if (dimming) {
          dimming.style.width = `${Math.max(0, offset)}px`;
          dimming.style.opacity = String(1 - progress);
        }
        if (shadow) {
          const remaining = (1 - progress) * width;
          shadow.style.opacity = String(remaining < shadowSize ? remaining / shadowSize : 1);
          shadow.style.transform = `translateX(${rtl ? -(offset - shadowSize) : offset - shadowSize}px)`;
        }
      };

      const key = transition.key;
      animationRef.current = animateSpring({
        params: NAVIGATION_SPRING,
        from: 0,
        to: 1,
        clamp: transition.pop,
        onValue: apply,
        onDone: () => {
          animationRef.current = null;
          setTransition((t) => (t?.key === key ? null : t));
        },
      });
      return () => {
        animationRef.current?.cancel();
        if (staticPage) staticPage.style.clipPath = "";
      };
    }, [transition]);

    useEffect(() => () => animationRef.current?.cancel(), []);

    // --- input -------------------------------------------------------------

    // Collapsed, the view's pop shortcuts: Escape, Alt+Left and the back
    // mouse button. At the root page they go on to an enclosing view.
    const canPopTop = collapsed && pushed && pageOf(topPane).canPop !== false;

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!canPopTop || e.defaultPrevented || isCoveredByLayer(e.currentTarget)) return;
        if (e.key === "Escape" || (e.altKey && e.key === "ArrowLeft")) {
          e.preventDefault();
          e.stopPropagation();
          pop();
        }
      },
      [canPopTop, pop],
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 3 && canPopTop) {
          e.preventDefault();
          e.stopPropagation();
          pop();
        }
      },
      [canPopTop, pop],
    );

    // --- render ------------------------------------------------------------

    const setRef = (el: HTMLDivElement | null) => {
      rootRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    // Uncollapsed, the sidebar gets CLAMP((int)(width × fraction), min, max),
    // at least its child's minimum width and at most what the content's
    // leaves (allocate_uncollapsed()), which is what grid track sizing does.
    const toPx = (value: number) =>
      Math.ceil(sidebarWidthUnit === "pt" ? (value * 96) / 72 : value);
    const minWidth = toPx(minSidebarWidth);
    const maxWidth = Math.max(minWidth, toPx(maxSidebarWidth));
    const sidebarTrack = `minmax(min-content, clamp(${minWidth}px, round(down, ${sidebarWidthFraction * 100}%, 1px), ${maxWidth}px))`;
    const contentTrack = "minmax(min-content, 1fr)";

    const classes = ["gtk-navigation-split-view"];
    if (collapsed) classes.push("gtk-bin-layout");
    if (className) classes.push(className);

    const renderPane = (pane: Pane) => {
      const page = pageOf(pane);
      const isMoving = transition?.moving === pane;
      const shown = !collapsed || transition !== null || pane === visiblePane;
      const paneClasses = ["gtk-widget", `${pane}-pane`, "gtk-bin-layout"];
      if (pane === "sidebar" && !start) paneClasses.push("end");
      return (
        // Collapsed, the pane only keeps the page's place in the element
        // tree, as the navigation view does uncollapsed.
        <div
          key={pane}
          className={collapsed ? undefined : paneClasses.join(" ")}
          style={
            collapsed
              ? { display: "contents" }
              : {
                  gridRow: 1,
                  gridColumn: (pane === "sidebar") === start ? 1 : 2,
                  gridTemplate: "minmax(0, 1fr) / 1fr",
                  minWidth: pane === "sidebar" ? minWidth : undefined,
                  minHeight: 0,
                }
          }
        >
          <div
            ref={(el) => {
              if (el) pageRefs.current[pane] = el;
              else delete pageRefs.current[pane];
            }}
            className="gtk-navigation-view-page gtk-bin-layout"
            tabIndex={-1}
            aria-hidden={collapsed && pane !== visiblePane ? true : undefined}
            inert={collapsed && pane !== visiblePane ? true : undefined}
            style={{
              gridArea: "1 / 1",
              // Collapsed, the page gets the whole view; uncollapsed, the
              // pane gets at least the page's minimum width.
              gridTemplate: collapsed ? "minmax(0, 1fr) / minmax(0, 1fr)" : "minmax(0, 1fr) / 1fr",
              position: "relative",
              minWidth: collapsed ? 0 : undefined,
              minHeight: 0,
              outline: "none",
              display: shown ? undefined : "none",
              // Ordered against the dimming, shadow and shield only during a
              // transition: at rest a z-index would make the page a stacking
              // context, and the popovers in it couldn't rise above the pages and
              // panes after it, as their own surfaces do in GTK.
              zIndex: isMoving ? 2 : transition ? 0 : undefined,
              transform: isMoving ? undefined : "none",
              willChange: isMoving ? "transform" : undefined,
            }}
          >
            <NavContext.Provider value={contexts[pane]}>
              <HeaderBarTitleContext.Provider value={page.title ?? ""}>
                <SplitViewTitleButtonsContext.Provider
                  value={pane === "sidebar" ? sidebarTitleButtons : contentTitleButtons}
                >
                  {page.children}
                </SplitViewTitleButtonsContext.Provider>
              </HeaderBarTitleContext.Provider>
            </NavContext.Provider>
          </div>
        </div>
      );
    };

    return (
      <div
        ref={setRef}
        className={classes.join(" ")}
        style={
          collapsed
            ? { gridTemplate: "minmax(0, 1fr) / minmax(0, 1fr)", ...style }
            : {
                display: "grid",
                gridTemplateRows: "minmax(0, 1fr)",
                gridTemplateColumns: start
                  ? `${sidebarTrack} ${contentTrack}`
                  : `${contentTrack} ${sidebarTrack}`,
                ...style,
              }
        }
        {...rest}
      >
        <div
          ref={viewRef}
          className={collapsed ? "gtk-navigation-view gtk-bin-layout" : undefined}
          onKeyDown={handleKeyDown}
          onMouseUp={handleMouseUp}
          tabIndex={collapsed ? -1 : undefined}
          style={
            collapsed
              ? {
                  position: "relative",
                  overflow: "hidden",
                  outline: "none",
                  gridTemplate: "minmax(0, 1fr) / minmax(0, 1fr)",
                }
              : { display: "contents" }
          }
        >
          {renderPane("sidebar")}
          {renderPane("content")}
          {transition && (
            <>
              <div
                ref={dimmingRef}
                className="gtk-dimming"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
              <div
                ref={shadowRef}
                className="gtk-shadow"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  },
);
