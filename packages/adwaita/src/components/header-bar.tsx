import { GtkLabel, useIcon, useWindowControls } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode, useCallback } from "react";
import type { AdwCenteringPolicy } from "../types.ts";
import { AdwBackButton } from "./back-button.tsx";
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

/** The window controls' accessible labels (gtkwindowcontrols.c). */
const WINDOW_CONTROL_LABELS: Record<string, string> = {
  close: "Close",
  minimize: "Minimize",
  maximize: "Maximize",
};

function WindowControlButton({ name, onClick }: { name: string; onClick?: () => void }) {
  const iconMap: Record<string, string> = {
    close: "WindowClose",
    minimize: "WindowMinimize",
    maximize: "WindowMaximize",
  };
  const Icon = useIcon(iconMap[name] ?? "");
  if (!Icon) return null;
  // Window controls can't take focus (gtk_widget_set_can_focus (button, FALSE)
  // in gtkwindowcontrols.c), and have an accessible label.
  return (
    <button
      className={`gtk-button image-button ${name}`}
      type="button"
      tabIndex={-1}
      aria-label={WINDOW_CONTROL_LABELS[name]}
      onMouseDown={(e) => e.preventDefault()}
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

/** The window control buttons on one side of a decoration layout. */
function controlButtons(layout: string, side: "start" | "end"): string[] {
  const [startPart = "", endPart = ""] = layout.split(":");
  const part = side === "start" ? startPart : endPart;
  return part.split(",").filter((b) => b && b !== "appmenu" && b !== "icon");
}

/** Whether a start/end prop holds a child. */
function hasChild(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

function WindowControls({ side, layout }: { side: "start" | "end"; layout: string }) {
  const controls = useWindowControls();
  const buttons = controlButtons(layout, side);
  // Empty controls are hidden, as AdwHeaderBar binds their visibility to "empty".
  if (buttons.length === 0) return null;

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
  // AdwBackButton shows when it can pop and has its icon; the start box needs
  // to know (update_box_visibility()).
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

  // A box with nothing in it is hidden, so its theme margin takes no space,
  // like update_box_visibility().
  const showStartBox =
    (showStartTitleButtons && controlButtons(decorationLayout, "start").length > 0) ||
    (showBackButton && nav.canPop && BackIcon !== undefined) ||
    hasChild(start);
  const showEndBox =
    (showEndTitleButtons && controlButtons(decorationLayout, "end").length > 0) || hasChild(end);

  return (
    <div ref={ref} className={classes.join(" ")} {...rest}>
      <div className="gtk-windowhandle gtk-bin-layout" onPointerDown={handleDrag}>
        {/* The start and end bins always exist, as in AdwHeaderBar. */}
        <div
          className="gtk-box gtk-center-layout"
          data-start=""
          data-center={showTitle && title ? "" : undefined}
          data-end=""
        >
          {showStartBox && (
            <div className="gtk-box gtk-box-layout horizontal start gtk-center-layout-start">
              {showStartTitleButtons && <WindowControls side="start" layout={decorationLayout} />}
              {showBackButton && <AdwBackButton />}
              {start}
            </div>
          )}
          <div className="gtk-center-layout-center">{showTitle && title}</div>
          {showEndBox && (
            <div className="gtk-box gtk-box-layout horizontal end gtk-center-layout-end">
              {end}
              {showEndTitleButtons && <WindowControls side="end" layout={decorationLayout} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
