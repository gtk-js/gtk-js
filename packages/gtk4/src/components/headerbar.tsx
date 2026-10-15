import { forwardRef, type HTMLAttributes, type PointerEvent, type ReactNode } from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, centerSlotAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkHeaderBarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Widget displayed in the title position (center). */
  titleWidget?: ReactNode;
  /** Whether to show window controls (close/minimize/maximize). Default: true. */
  showWindowControls?: boolean;
  /**
   * Window button layout string, matching GTK's decoration-layout format.
   * Colon separates start from end. Default: "appmenu:minimize,maximize,close".
   */
  decorationLayout?: string;
  /** Start-side children (before title). */
  start?: ReactNode;
  /** End-side children (after title). */
  end?: ReactNode;
  /**
   * Called when the close button is clicked.
   * Mirrors GTK's window.close action registered on GtkWindow.
   */
  onWindowClose?: () => void;
  /**
   * Called when the maximize/restore button is clicked.
   * Mirrors GTK's window.toggle-maximized action registered on GtkWindow.
   */
  onWindowToggleMaximized?: () => void;
  /**
   * Called when the minimize button is clicked.
   * Mirrors GTK's window.minimize action registered on GtkWindow.
   */
  onWindowMinimize?: () => void;
  /**
   * Called on pointerdown on the windowhandle (drag region).
   * Mirrors GTK's GtkWindowHandle drag-begin signal.
   */
  onWindowHandleDragStart?: (e: PointerEvent<HTMLDivElement>) => void;
}

/** Maps decoration-layout button names to icon component PascalCase names. */
const controlIconNames: Record<string, string> = {
  close: "WindowClose",
  minimize: "WindowMinimize",
  maximize: "WindowMaximize",
};

function WindowControlButton({ name, onClick }: { name: string; onClick?: () => void }) {
  const iconName = controlIconNames[name];
  const Icon = useIcon(iconName ?? "");

  if (!Icon) return null;

  return (
    <button
      className={`gtk-button image-button ${name}`}
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span className="gtk-image">
        <Icon size={16} />
      </span>
    </button>
  );
}

function WindowControls({
  side,
  layout,
  onWindowClose,
  onWindowToggleMaximized,
  onWindowMinimize,
}: {
  side: "start" | "end";
  layout: string;
  onWindowClose?: () => void;
  onWindowToggleMaximized?: () => void;
  onWindowMinimize?: () => void;
}) {
  const [startPart = "", endPart = ""] = layout.split(":");
  const part = side === "start" ? startPart : endPart;
  const buttons = part.split(",").filter((b) => b && b !== "appmenu");

  const clickHandlers: Record<string, (() => void) | undefined> = {
    close: onWindowClose,
    maximize: onWindowToggleMaximized,
    minimize: onWindowMinimize,
  };

  // Empty controls are hidden, as GtkHeaderBar binds their visibility to "empty".
  if (buttons.length === 0) return null;

  return (
    <div className={`gtk-windowcontrols gtk-box-layout horizontal ${side}`}>
      {buttons.map((name) => (
        <WindowControlButton key={name} name={name} onClick={clickHandlers[name]} />
      ))}
    </div>
  );
}

/**
 * GtkHeaderBar — A bar for window titles and controls.
 *
 * Outer: GtkBinLayout. Inner: GtkCenterLayout via windowhandle > box.
 *
 * CSS node tree (must match for theme selectors):
 *   headerbar
 *     └── windowhandle
 *         └── box (CenterLayout)
 *             ├── box.start
 *             ├── <title widget>
 *             └── box.end
 *
 * Window control buttons mirror GTK's action system:
 *   - close     → window.close action
 *   - maximize  → window.toggle-maximized action
 *   - minimize  → window.minimize action
 *
 * @see https://docs.gtk.org/gtk4/class.HeaderBar.html
 * @see upstream/gtk/gtk/gtkwindowcontrols.c
 */
export const GtkHeaderBar = forwardRef<HTMLDivElement, GtkHeaderBarProps>(function GtkHeaderBar(
  {
    titleWidget,
    showWindowControls = true,
    decorationLayout = "appmenu:minimize,maximize,close",
    start,
    end,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    children,
    onWindowClose,
    onWindowToggleMaximized,
    onWindowMinimize,
    onWindowHandleDragStart,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-headerbar", "gtk-bin-layout"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      <div className="gtk-windowhandle gtk-bin-layout" onPointerDown={onWindowHandleDragStart}>
        {/* The start and end boxes always exist, as in GtkHeaderBar. */}
        <div
          className="gtk-box gtk-center-layout"
          {...centerSlotAttrs(true, titleWidget ?? children, true)}
        >
          <div className="gtk-box gtk-box-layout horizontal start gtk-center-layout-start">
            {showWindowControls && (
              <WindowControls
                side="start"
                layout={decorationLayout}
                onWindowClose={onWindowClose}
                onWindowToggleMaximized={onWindowToggleMaximized}
                onWindowMinimize={onWindowMinimize}
              />
            )}
            {start}
          </div>

          <div className="gtk-center-layout-center">{titleWidget ?? children}</div>

          <div className="gtk-box gtk-box-layout horizontal end gtk-center-layout-end">
            {end}
            {showWindowControls && (
              <WindowControls
                side="end"
                layout={decorationLayout}
                onWindowClose={onWindowClose}
                onWindowToggleMaximized={onWindowToggleMaximized}
                onWindowMinimize={onWindowMinimize}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
