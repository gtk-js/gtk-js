import { GtkRevealer, GtkWindowHandle } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode, useLayoutEffect, useState } from "react";
import type { AdwToolbarStyle } from "../types.ts";

export interface AdwToolbarViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  content?: ReactNode;
  topBars?: ReactNode;
  bottomBars?: ReactNode;
  topBarStyle?: AdwToolbarStyle;
  bottomBarStyle?: AdwToolbarStyle;
  revealTopBars?: boolean;
  revealBottomBars?: boolean;
  extendContentToTopEdge?: boolean;
  extendContentToBottomEdge?: boolean;
}

function barClasses(bar: "top-bar" | "bottom-bar", s: AdwToolbarStyle): string {
  if (s === "raised") return `${bar} raised`;
  if (s === "raised-border") return `${bar} raised border`;
  return bar;
}

/**
 * update_collapse_style(): a bar box with more than one visible bar gets
 * .collapse-spacing, which makes its header bars and toolbars thinner. Bars
 * can be fragments, or hide themselves, so count what is rendered.
 */
function useCollapseSpacing(box: HTMLDivElement | null): boolean {
  const [collapse, setCollapse] = useState(false);
  useLayoutEffect(() => {
    if (!box) return;
    const update = () => {
      const visible = [...box.children].filter(
        (child) => getComputedStyle(child).display !== "none",
      );
      setCollapse(visible.length > 1);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(box, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });
    return () => observer.disconnect();
  }, [box]);
  return collapse;
}

/**
 * Whether a bar takes any height, which its revealer animates: the undershoot
 * stays while a bar slides out (gtk_widget_get_height() in update_undershoots()).
 */
function useHasHeight(bar: HTMLDivElement | null, initial: boolean): boolean {
  const [hasHeight, setHasHeight] = useState(initial);
  useLayoutEffect(() => {
    if (!bar) return;
    const observer = new ResizeObserver(() => setHasHeight(bar.offsetHeight > 0));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [bar]);
  return hasHeight;
}

/**
 * AdwToolbarView — A layout with top/bottom bar slots.
 *
 * The bars are drawn over the content, which gets the space between them, or
 * the whole view on the sides it extends to (adw_toolbar_view_size_allocate()).
 * Each bar box is in a revealer that slides it in and out, and a window handle.
 *
 * CSS node (upstream puts the content first, so it's drawn under the bars):
 *   toolbarview[.undershoot-top][.undershoot-bottom]
 *     ├── revealer.top-bar[.raised][.border]
 *     │     └── windowhandle
 *     │           └── box.vertical[.collapse-spacing]
 *     ├── [content]
 *     └── revealer.bottom-bar[.raised][.border]
 *           └── windowhandle
 *                 └── box.vertical[.collapse-spacing]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ToolbarView.html
 * @see upstream/libadwaita/src/adw-toolbar-view.c
 */
export const AdwToolbarView = forwardRef<HTMLDivElement, AdwToolbarViewProps>(
  function AdwToolbarView(
    {
      content,
      topBars,
      bottomBars,
      topBarStyle = "flat",
      bottomBarStyle = "flat",
      revealTopBars = true,
      revealBottomBars = true,
      extendContentToTopEdge = false,
      extendContentToBottomEdge = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const [topBar, setTopBar] = useState<HTMLDivElement | null>(null);
    const [bottomBar, setBottomBar] = useState<HTMLDivElement | null>(null);
    const [topBox, setTopBox] = useState<HTMLDivElement | null>(null);
    const [bottomBox, setBottomBox] = useState<HTMLDivElement | null>(null);
    const collapseTop = useCollapseSpacing(topBox);
    const collapseBottom = useCollapseSpacing(bottomBox);
    const topBarShown = useHasHeight(topBar, revealTopBars);
    const bottomBarShown = useHasHeight(bottomBar, revealBottomBars);

    const classes = ["gtk-toolbarview"];
    // Content scrolled under a flat bar gets the scrolled window's undershoot
    // shade (update_undershoots()).
    if (topBarStyle === "flat" && !extendContentToTopEdge && topBars && topBarShown)
      classes.push("undershoot-top");
    if (bottomBarStyle === "flat" && !extendContentToBottomEdge && bottomBars && bottomBarShown)
      classes.push("undershoot-bottom");
    if (className) classes.push(className);

    // Rows: top bar, content, bottom bar. Tab follows the DOM (top bar first,
    // as GTK sorts focus by position), while `order` paints the content first
    // and the bars, with their shadows, over it.
    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        style={{
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gridTemplateColumns: "minmax(0, 1fr)",
          ...style,
        }}
        {...rest}
      >
        {topBars && (
          <GtkRevealer
            ref={setTopBar}
            className={barClasses("top-bar", topBarStyle)}
            revealChild={revealTopBars}
            transitionType="slide-down"
            style={{ gridRow: 1, gridColumn: 1 }}
          >
            <GtkWindowHandle>
              <div
                ref={setTopBox}
                className={`gtk-box gtk-box-layout vertical${collapseTop ? " collapse-spacing" : ""}`}
              >
                {topBars}
              </div>
            </GtkWindowHandle>
          </GtkRevealer>
        )}
        {/* The content aligns in its area with its halign/valign. */}
        <div
          className="gtk-bin-layout"
          style={{
            gridRow: `${extendContentToTopEdge ? 1 : 2} / ${extendContentToBottomEdge ? 4 : 3}`,
            gridColumn: 1,
            order: -1,
            overflow: "hidden",
            minHeight: 0,
            gridTemplate: "minmax(0, 1fr) / minmax(0, 1fr)",
          }}
        >
          {content}
        </div>
        {bottomBars && (
          <GtkRevealer
            ref={setBottomBar}
            className={barClasses("bottom-bar", bottomBarStyle)}
            revealChild={revealBottomBars}
            transitionType="slide-up"
            style={{ gridRow: 3, gridColumn: 1 }}
          >
            <GtkWindowHandle>
              <div
                ref={setBottomBox}
                className={`gtk-box gtk-box-layout vertical${collapseBottom ? " collapse-spacing" : ""}`}
              >
                {bottomBars}
              </div>
            </GtkWindowHandle>
          </GtkRevealer>
        )}
      </div>
    );
  },
);
