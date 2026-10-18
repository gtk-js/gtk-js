import {
  GtkLabel,
  GtkWindowControls,
  GtkWindowHandle,
  useIcon,
  useWindowControls,
} from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import type { AdwCenteringPolicy } from "../types.ts";
import { useHeaderBarTitle } from "./header-bar-title.ts";
import { useNavigation } from "./navigation-view.tsx";

export interface AdwHeaderBarProps extends HTMLAttributes<HTMLDivElement> {
  titleWidget?: ReactNode;
  showStartTitleButtons?: boolean;
  showEndTitleButtons?: boolean;
  showBackButton?: boolean;
  showTitle?: boolean;
  decorationLayout?: string;
  centeringPolicy?: AdwCenteringPolicy;
  start?: ReactNode;
  end?: ReactNode;
}

/**
 * AdwHeaderBar — An adaptive header bar with navigation integration.
 *
 * Window control buttons (close, minimize, maximize) call handlers from
 * WindowControlsContext, which is set up by the parent GtkWindow.
 * Its window handle moves the window, maximizes it on a double click and
 * opens the window menu on a right click (GtkWindowHandle).
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.HeaderBar.html
 */
export const AdwHeaderBar = forwardRef<HTMLDivElement, AdwHeaderBarProps>(function AdwHeaderBar(
  {
    titleWidget,
    showStartTitleButtons = true,
    showEndTitleButtons = true,
    showBackButton = true,
    showTitle = true,
    decorationLayout: decorationLayoutProp,
    centeringPolicy = "loose",
    start,
    end,
    className,
    children,
    ...rest
  },
  ref,
) {
  const BackIcon = useIcon("GoPrevious");
  const controls = useWindowControls();
  const decorationLayout =
    decorationLayoutProp ?? controls?.decorationLayout ?? "appmenu:minimize,maximize,close";
  const nav = useNavigation();
  // AdwHeaderBar and GtkWindowHandle are GtkBinLayout widgets: the window
  // handle and its center box get the bar's full height (adw-header-bar.c).
  const classes = ["gtk-headerbar", "gtk-bin-layout"];
  if (className) classes.push(className);

  // Without a title widget, the title of the page or dialog it's in, like
  // construct_title_label() and update_title().
  const contextTitle = useHeaderBarTitle();
  const title =
    titleWidget ??
    children ??
    (contextTitle !== undefined ? (
      <GtkLabel
        label={contextTitle}
        className="title"
        valign="center"
        ellipsize="end"
        widthChars={5}
      />
    ) : undefined);

  return (
    <div ref={ref} className={classes.join(" ")} {...rest}>
      <GtkWindowHandle>
        {/* The start and end boxes always exist, as in AdwHeaderBar. */}
        <div
          className="gtk-box gtk-center-layout"
          data-start=""
          data-center={showTitle && title ? "" : undefined}
          data-end=""
        >
          <div className="gtk-box gtk-box-layout horizontal start gtk-center-layout-start">
            {showStartTitleButtons && (
              <GtkWindowControls side="start" decorationLayout={decorationLayout} />
            )}
            {showBackButton && nav.canPop && BackIcon && (
              <button
                className="gtk-button image-button back flat"
                type="button"
                aria-label="Back"
                title={nav.previousTitle || "Back"}
                onClick={() => nav.pop()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="gtk-image">
                  <BackIcon size={16} />
                </span>
              </button>
            )}
            {start}
          </div>
          <div className="gtk-center-layout-center">{showTitle && title}</div>
          <div className="gtk-box gtk-box-layout horizontal end gtk-center-layout-end">
            {end}
            {showEndTitleButtons && (
              <GtkWindowControls side="end" decorationLayout={decorationLayout} />
            )}
          </div>
        </div>
      </GtkWindowHandle>
    </div>
  );
});
