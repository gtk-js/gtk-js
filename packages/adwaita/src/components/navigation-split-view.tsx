import { forwardRef, type HTMLAttributes, useCallback, useEffect, useState } from "react";
import { type AdwNavigationPageProps, AdwNavigationView, NavContext } from "./navigation-view.tsx";

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

/**
 * Collapsed mode: like upstream, the two panes live in an internal
 * AdwNavigationView with the sidebar as the root page and the content
 * pushed on top, so transitions, gestures and back buttons behave the same.
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

  // Follow the prop when the parent changes it.
  useEffect(() => {
    setInternalShowContent(showContent);
  }, [showContent]);

  const stack = internalShowContent ? [sidebar.tag, content.tag] : [sidebar.tag];

  const handleStackChange = useCallback(
    (next: string[]) => {
      const show = next[next.length - 1] === content.tag;
      setInternalShowContent(show);
      onShowContentChanged?.(show);
    },
    [content.tag, onShowContentChanged],
  );

  return (
    <AdwNavigationView
      pages={[sidebar, content]}
      stack={stack}
      onStackChange={handleStackChange}
      style={{ width: "100%", height: "100%" }}
    />
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
