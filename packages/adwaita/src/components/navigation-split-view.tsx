import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type AdwNavigationPageProps, NavContext } from "./navigation-view.tsx";

// Re-export the page props type for consumers
export type { AdwNavigationPageProps };

export interface AdwNavigationSplitViewProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  /** Sidebar pane (displayed on the start side). Must be a NavigationPage. */
  sidebar: AdwNavigationPageProps;
  /** Content pane (displayed on the end side). Must be a NavigationPage. */
  content: AdwNavigationPageProps;
  /** Whether the view is collapsed to single-pane mode. Default: false. */
  collapsed?: boolean;
  /** Which pane is visible when collapsed. Default: false (sidebar visible). */
  showContent?: boolean;
  /** Sidebar width as fraction of total width. Default: 0.25. */
  sidebarWidthFraction?: number;
  /** Minimum sidebar width in px. Default: 180. */
  minSidebarWidth?: number;
  /** Maximum sidebar width in px. Default: 280. */
  maxSidebarWidth?: number;
  /** Fires when internal navigation changes which pane is visible. */
  onShowContentChanged?: (showContent: boolean) => void;
}

const PAGE_TRANSITION = "transform 200ms ease-out";

type TransitionDirection = "push" | "pop";

interface SplitTransition {
  key: number;
  direction: TransitionDirection;
  phase: "starting" | "running";
}

/**
 * Collapsed mode: a simplified two-page navigator with slide transitions.
 * Reuses the same animation pattern as AdwNavigationView but for exactly
 * two pages (sidebar = root, content = pushed on top).
 */
function CollapsedNavigator({
  sidebar,
  content,
  showContent,
  onShowContentChanged,
}: {
  sidebar: AdwNavigationPageProps;
  content: AdwNavigationPageProps;
  showContent: boolean;
  onShowContentChanged?: (show: boolean) => void;
}) {
  const [internalShowContent, setInternalShowContent] = useState(showContent);
  const [transition, setTransition] = useState<SplitTransition | null>(null);
  const transitionKeyRef = useRef(0);
  const transitionFrameRef = useRef<number | null>(null);
  const prevShowContentRef = useRef(internalShowContent);
  // Track whether changes are from internal navigation (pop/push) vs prop
  const internalChangeRef = useRef(false);
  const canPop = internalShowContent && content.canPop !== false;

  // Sync external prop to internal state
  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }
    setInternalShowContent(showContent);
  }, [showContent]);

  // Trigger transitions when internalShowContent changes
  useLayoutEffect(() => {
    const prev = prevShowContentRef.current;
    prevShowContentRef.current = internalShowContent;

    if (prev === internalShowContent) return;

    if (transitionFrameRef.current !== null) {
      cancelAnimationFrame(transitionFrameRef.current);
    }

    const key = ++transitionKeyRef.current;

    setTransition({
      key,
      direction: internalShowContent ? "push" : "pop",
      phase: "starting",
    });

    transitionFrameRef.current = requestAnimationFrame(() => {
      setTransition((t) => (t?.key === key ? { ...t, phase: "running" } : t));
      transitionFrameRef.current = null;
    });

    return () => {
      if (transitionFrameRef.current !== null) {
        cancelAnimationFrame(transitionFrameRef.current);
        transitionFrameRef.current = null;
      }
    };
  }, [internalShowContent]);

  const push = useCallback(
    (tag: string) => {
      if (tag === content.tag) {
        internalChangeRef.current = true;
        setInternalShowContent(true);
        onShowContentChanged?.(true);
      }
    },
    [content.tag, onShowContentChanged],
  );

  const pop = useCallback((): boolean => {
    if (!canPop) return false;
    internalChangeRef.current = true;
    setInternalShowContent(false);
    onShowContentChanged?.(false);
    return true;
  }, [canPop, onShowContentChanged]);

  const handleTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>, key: number) => {
      if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
      setTransition((t) => (t?.key === key ? null : t));
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && canPop) {
        e.preventDefault();
        pop();
      }
    },
    [canPop, pop],
  );

  const renderPage = (
    page: AdwNavigationPageProps,
    role: "single" | "entering" | "leaving",
    activeTransition?: SplitTransition,
  ) => {
    let transform = "translateX(0)";
    let transitionStyle = "none";
    let zIndex = 0;
    let onTransitionEnd: ((event: React.TransitionEvent<HTMLDivElement>) => void) | undefined;

    if (activeTransition) {
      transitionStyle = activeTransition.phase === "running" ? PAGE_TRANSITION : "none";
      const isPush = activeTransition.direction === "push";
      const isEntering = role === "entering";

      if (activeTransition.phase === "starting") {
        if (isEntering) {
          transform = isPush ? "translateX(100%)" : "translateX(-100%)";
        }
      } else if (isEntering) {
        transform = "translateX(0)";
      } else {
        transform = isPush ? "translateX(-100%)" : "translateX(100%)";
      }

      if (role !== "single") {
        zIndex = isEntering ? 1 : 0;
        // Only the entering page listens for transitionEnd to clear the transition
        if (isEntering) {
          onTransitionEnd = (event) => handleTransitionEnd(event, activeTransition.key);
        }
      }
    }

    const isTransitioning = role !== "single";

    return (
      <div
        key={`${role}:${page.tag}${activeTransition ? `:${activeTransition.key}` : ""}`}
        className="gtk-navigation-view-page gtk-bin-layout"
        aria-hidden={role === "leaving" ? true : undefined}
        onTransitionEnd={onTransitionEnd}
        style={{
          position: isTransitioning ? "absolute" : "relative",
          inset: isTransitioning ? 0 : undefined,
          overflow: "hidden",
          transform,
          transition: transitionStyle,
          willChange: activeTransition ? "transform" : undefined,
          zIndex,
        }}
      >
        {page.children}
      </div>
    );
  };

  const currentPage = internalShowContent ? content : sidebar;

  return (
    <NavContext.Provider value={{ push, pop, canPop }}>
      <div
        className="gtk-navigation-view gtk-bin-layout"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%" }}
      >
        {transition
          ? [
              renderPage(
                transition.direction === "push" ? sidebar : content,
                "leaving",
                transition,
              ),
              renderPage(
                transition.direction === "push" ? content : sidebar,
                "entering",
                transition,
              ),
            ]
          : renderPage(currentPage, "single")}
      </div>
    </NavContext.Provider>
  );
}

// No-op nav context for uncollapsed mode (canPop = false, so back buttons hide)
const uncollapsedNavContext = {
  push: () => {},
  pop: () => false as const,
  canPop: false,
};

/**
 * AdwNavigationSplitView — A split view that adapts between side-by-side
 * and stack-based navigation.
 *
 * When uncollapsed: both panes displayed side-by-side.
 * When collapsed: wraps both panes in a navigator — only one visible at a
 * time, with slide transitions between them. The sidebar is the root page,
 * and the content is pushed on top.
 *
 * This is the modern replacement for AdwLeaflet for sidebar+content layouts.
 *
 * CSS node: navigation-split-view
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.NavigationSplitView.html
 */
export const AdwNavigationSplitView = forwardRef<HTMLDivElement, AdwNavigationSplitViewProps>(
  function AdwNavigationSplitView(
    {
      sidebar,
      content,
      collapsed = false,
      showContent = false,
      sidebarWidthFraction = 0.25,
      minSidebarWidth = 180,
      maxSidebarWidth = 280,
      onShowContentChanged,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const classes = ["gtk-navigation-split-view"];
    if (collapsed) classes.push("collapsed");
    if (className) classes.push(className);

    if (collapsed) {
      return (
        <div ref={ref} className={classes.join(" ")} style={style} {...rest}>
          <CollapsedNavigator
            sidebar={sidebar}
            content={content}
            showContent={showContent}
            onShowContentChanged={onShowContentChanged}
          />
        </div>
      );
    }

    return (
      <NavContext.Provider value={uncollapsedNavContext}>
        <div
          ref={ref}
          className={classes.join(" ")}
          style={{ display: "flex", ...style }}
          {...rest}
        >
          <div
            className="widget sidebar-pane"
            style={{
              width: `clamp(${minSidebarWidth}px, ${sidebarWidthFraction * 100}%, ${maxSidebarWidth}px)`,
              flexShrink: 0,
            }}
          >
            {sidebar.children}
          </div>
          <div className="widget content-pane" style={{ flex: 1, minWidth: 0 }}>
            {content.children}
          </div>
        </div>
      </NavContext.Provider>
    );
  },
);
