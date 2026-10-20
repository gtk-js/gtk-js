import {
  forwardRef,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
  useMemo,
  useRef,
} from "react";
import { useCenterLayout } from "../layouts/center-allocation.ts";
import { alignAttrs, centerSlotAttrs, type GtkAlignProps } from "../types.ts";
import {
  useWindowControls,
  type WindowControlsAPI,
  WindowControlsContext,
} from "../window-controls-context.tsx";
import { GtkLabel } from "./label.tsx";
import { GtkWindowControls } from "./window-controls.tsx";
import { GtkWindowHandle } from "./window-handle.tsx";

export interface GtkHeaderBarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Widget displayed in the title position (center). */
  titleWidget?: ReactNode;
  /** Whether to show window controls (close/minimize/maximize). Default: true. */
  showWindowControls?: boolean;
  /**
   * Window button layout string, matching GTK's decoration-layout format.
   * Colon separates start from end; without one, both sides use the whole
   * string. Default: the window's (or dialog's), else
   * "appmenu:minimize,maximize,close".
   */
  decorationLayout?: string;
  /** Start-side children (before title). */
  start?: ReactNode;
  /** End-side children (after title). */
  end?: ReactNode;
  /**
   * Called when the close button is clicked, instead of the enclosing
   * GtkWindow's `onClose` (GTK's window.close action).
   */
  onWindowClose?: () => void;
  /**
   * Called when the maximize/restore button is clicked or the title bar is
   * double-clicked, instead of the enclosing GtkWindow's `onMaximize` (GTK's
   * window.toggle-maximized action).
   */
  onWindowToggleMaximized?: () => void;
  /**
   * Called when the minimize button is clicked, instead of the enclosing
   * GtkWindow's `onMinimize` (GTK's window.minimize action).
   */
  onWindowMinimize?: () => void;
  /**
   * Called when a press on the window handle passes the drag threshold, with
   * that pointer move, instead of the enclosing GtkWindow's `onDrag`
   * (GtkWindowHandle's gdk_toplevel_begin_move()).
   */
  onWindowHandleDragStart?: (e: PointerEvent<HTMLDivElement>) => void;
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
 * Window control buttons mirror GTK's action system, acting on the enclosing
 * GtkWindow (or the header bar's own handlers):
 *   - close     → window.close action
 *   - maximize  → window.toggle-maximized action
 *   - minimize  → window.minimize action
 * The window handle moves the window, maximizes it on a double click and
 * opens the window menu on a right click (GtkWindowHandle).
 *
 * @see https://docs.gtk.org/gtk4/class.HeaderBar.html
 * @see upstream/gtk/gtk/gtkwindowcontrols.c
 */
export const GtkHeaderBar = forwardRef<HTMLDivElement, GtkHeaderBarProps>(function GtkHeaderBar(
  {
    titleWidget,
    showWindowControls = true,
    decorationLayout,
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

  // The header bar's own handlers take the place of the window's actions for
  // its controls and handle.
  const windowControls = useWindowControls();
  const controls = useMemo<WindowControlsAPI | undefined>(
    () =>
      onWindowClose || onWindowMinimize || onWindowToggleMaximized || onWindowHandleDragStart
        ? {
            ...windowControls,
            close: onWindowClose ?? windowControls?.close,
            minimize: onWindowMinimize ?? windowControls?.minimize,
            maximize: onWindowToggleMaximized ?? windowControls?.maximize,
            drag: onWindowHandleDragStart ?? windowControls?.drag,
          }
        : windowControls,
    [
      windowControls,
      onWindowClose,
      onWindowMinimize,
      onWindowToggleMaximized,
      onWindowHandleDragStart,
    ],
  );

  // Without a title widget, a label with the window's title
  // (construct_title_label(), update_title()).
  const title =
    titleWidget ??
    children ??
    (controls?.title ? (
      <GtkLabel
        label={controls.title}
        className="title"
        valign="center"
        ellipsize="end"
        widthChars={5}
      />
    ) : undefined);

  const centerBoxRef = useRef<HTMLDivElement>(null);
  useCenterLayout(centerBoxRef);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      <WindowControlsContext.Provider value={controls}>
        <GtkWindowHandle>
          {/* The start and end boxes always exist, as in GtkHeaderBar. */}
          <div
            ref={centerBoxRef}
            className="gtk-box gtk-center-layout"
            {...centerSlotAttrs(true, title, true)}
          >
            <div className="gtk-box gtk-box-layout horizontal start gtk-center-layout-start">
              {showWindowControls && (
                <GtkWindowControls side="start" decorationLayout={decorationLayout} />
              )}
              {start}
            </div>

            <div className="gtk-center-layout-center">{title}</div>

            <div className="gtk-box gtk-box-layout horizontal end gtk-center-layout-end">
              {end}
              {showWindowControls && (
                <GtkWindowControls side="end" decorationLayout={decorationLayout} />
              )}
            </div>
          </div>
        </GtkWindowHandle>
      </WindowControlsContext.Provider>
    </div>
  );
});
