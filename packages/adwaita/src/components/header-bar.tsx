import { GtkLabel, useIcon, useWindowControls } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode, useCallback } from "react";
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

function WindowControlButton({ name, onClick }: { name: string; onClick?: () => void }) {
  const iconMap: Record<string, string> = {
    close: "WindowClose",
    minimize: "WindowMinimize",
    maximize: "WindowMaximize",
  };
  const Icon = useIcon(iconMap[name] ?? "");
  if (!Icon) return null;
  return (
    <button
      className={`gtk-button image-button ${name}`}
      type="button"
      onClick={onClick}
      onPointerDown={(e) => {
        // Stop propagation so the windowhandle drag handler doesn't fire.
        // In Tauri/WebKitGTK, startDragging() captures all input and
        // prevents the subsequent click event from reaching the button.
        e.stopPropagation();
      }}
    >
      <span className="gtk-image">
        <Icon size={16} />
      </span>
    </button>
  );
}

function WindowControls({ side, layout }: { side: "start" | "end"; layout: string }) {
  const controls = useWindowControls();
  const [startPart = "", endPart = ""] = layout.split(":");
  const part = side === "start" ? startPart : endPart;
  const buttons = part.split(",").filter((b) => b && b !== "appmenu" && b !== "icon");
  if (buttons.length === 0) return <div className={`gtk-windowcontrols ${side} empty`} />;

  const clickHandlers: Record<string, (() => void) | undefined> = {
    close: controls?.close,
    minimize: controls?.minimize,
    maximize: controls?.maximize,
  };

  return (
    <div className={`gtk-windowcontrols gtk-box-layout horizontal ${side}`}>
      {buttons.map((name) => (
        <WindowControlButton key={name} name={name} onClick={clickHandlers[name]} />
      ))}
    </div>
  );
}

/**
 * AdwHeaderBar — An adaptive header bar with navigation integration.
 *
 * Window control buttons (close, minimize, maximize) call handlers from
 * WindowControlsContext, which is set up by the parent GtkWindow.
 * The titlebar drag region calls the drag handler for window move.
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
  const classes = ["gtk-headerbar"];
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

  const handleDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!controls?.drag) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("button, [role='button'], a, input, select, textarea")
      )
        return;
      controls.drag();
    },
    [controls],
  );

  return (
    <div ref={ref} className={classes.join(" ")} {...rest}>
      <div className="gtk-windowhandle" onPointerDown={handleDrag}>
        {/* The start and end boxes always exist, as in AdwHeaderBar. */}
        <div
          className="gtk-box gtk-center-layout"
          data-start=""
          data-center={showTitle && title ? "" : undefined}
          data-end=""
        >
          <div className="gtk-box gtk-box-layout horizontal start gtk-center-layout-start">
            {showStartTitleButtons && <WindowControls side="start" layout={decorationLayout} />}
            {showBackButton && nav.canPop && BackIcon && (
              <button
                className="gtk-button image-button back flat"
                type="button"
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
            {showEndTitleButtons && <WindowControls side="end" layout={decorationLayout} />}
          </div>
        </div>
      </div>
    </div>
  );
});
