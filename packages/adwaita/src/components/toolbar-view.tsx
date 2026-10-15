import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
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

function barStyleClasses(s: AdwToolbarStyle): string {
  if (s === "raised") return "raised";
  if (s === "raised-border") return "raised border";
  return "";
}

/**
 * AdwToolbarView — A layout with top/bottom bar slots.
 *
 * CSS node:
 *   toolbarview
 *     ├── revealer.top-bar[.raised][.border]
 *     ├── [content]
 *     └── revealer.bottom-bar[.raised][.border]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ToolbarView.html
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
    const classes = ["gtk-toolbarview"];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        style={{ display: "flex", flexDirection: "column", ...style }}
        {...rest}
      >
        {revealTopBars && topBars && (
          <div className={`gtk-revealer top-bar ${barStyleClasses(topBarStyle)}`}>
            <div className="gtk-windowhandle gtk-bin-layout">
              <div className="gtk-box gtk-box-layout vertical">{topBars}</div>
            </div>
          </div>
        )}
        {/* The content gets the rest of the view, and aligns in it with its
            halign/valign (adw_toolbar_view_size_allocate()). */}
        <div
          className="gtk-bin-layout"
          style={{
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
            gridTemplate: "minmax(0, 1fr) / minmax(0, 1fr)",
          }}
        >
          {content}
        </div>
        {revealBottomBars && bottomBars && (
          <div className={`gtk-revealer bottom-bar ${barStyleClasses(bottomBarStyle)}`}>
            <div className="gtk-windowhandle gtk-bin-layout">
              <div className="gtk-box gtk-box-layout vertical">{bottomBars}</div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
