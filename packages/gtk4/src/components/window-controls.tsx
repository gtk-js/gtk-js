import { forwardRef, type HTMLAttributes } from "react";
import { noFocusOnClick } from "../focus-on-click.ts";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { useDecorationLayout, useWindowControls } from "../window-controls-context.tsx";

export interface GtkWindowControlsProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Which side of the decoration layout to show. */
  side: "start" | "end";
  /**
   * The decoration layout, e.g. "appmenu:minimize,maximize,close". Defaults to
   * the enclosing window's (or dialog's), then to GtkProvider's (GtkSettings).
   */
  decorationLayout?: string;
}

/** The window controls' accessible labels (gtkwindowcontrols.c). */
const CONTROL_LABELS: Record<string, string> = {
  minimize: "Minimize",
  maximize: "Maximize",
  close: "Close",
};

/**
 * The buttons on one side of a decoration layout, like get_layout() and
 * update_window_buttons(): split at the first colon, a layout without one
 * applies to both sides, and only minimize, maximize and close make a button
 * (there's no window icon on the web, and other names are ignored).
 */
export function windowControlButtons(layout: string, side: "start" | "end"): string[] {
  const colon = layout.indexOf(":");
  const part =
    colon < 0 ? layout : side === "start" ? layout.slice(0, colon) : layout.slice(colon + 1);
  return part.split(",").filter((name) => name in CONTROL_LABELS);
}

function WindowControlButton({
  name,
  maximized,
  onClick,
}: {
  name: string;
  maximized: boolean;
  onClick?: () => void;
}) {
  // window-restore-symbolic while the window is maximized (update_window_buttons()).
  const iconName =
    name === "close"
      ? "WindowClose"
      : name === "minimize"
        ? "WindowMinimize"
        : maximized
          ? "WindowRestore"
          : "WindowMaximize";
  const Icon = useIcon(iconName);
  if (!Icon) return null;
  // The buttons can't take focus (gtk_widget_set_can_focus (button, FALSE)).
  return (
    <button
      className={`gtk-button image-button ${name}`}
      type="button"
      tabIndex={-1}
      aria-label={CONTROL_LABELS[name]}
      {...noFocusOnClick()}
      onClick={onClick}
    >
      <span className="gtk-image">
        <Icon size={16} />
      </span>
    </button>
  );
}

/**
 * GtkWindowControls — The minimize, maximize and close buttons of one side of
 * the decoration layout. They activate the enclosing GtkWindow's
 * window.minimize, window.toggle-maximized and window.close actions
 * (WindowControlsContext). Header bars hide empty controls (bound to "empty"),
 * so empty controls render nothing.
 *
 * CSS node:
 *   windowcontrols.start / windowcontrols.end
 *     └── button.minimize / button.maximize / button.close
 *
 * @see https://docs.gtk.org/gtk4/class.WindowControls.html
 * @see upstream/gtk/gtk/gtkwindowcontrols.c
 */
export const GtkWindowControls = forwardRef<HTMLDivElement, GtkWindowControlsProps>(
  function GtkWindowControls(
    { side, decorationLayout, halign, valign, hexpand, vexpand, className, ...rest },
    ref,
  ) {
    const controls = useWindowControls();
    const settingsLayout = useDecorationLayout();
    const layout = decorationLayout ?? controls?.decorationLayout ?? settingsLayout;
    const buttons = windowControlButtons(layout, side);
    if (buttons.length === 0) return null;

    const actions: Record<string, (() => void) | undefined> = {
      minimize: controls?.minimize,
      maximize: controls?.maximize,
      close: controls?.close,
    };
    const classes = ["gtk-windowcontrols", "gtk-box-layout", "horizontal", side];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        {buttons.map((name, i) => (
          <WindowControlButton
            // Positional: a layout may repeat a name.
            key={i}
            name={name}
            maximized={!!controls?.maximized}
            onClick={actions[name]}
          />
        ))}
      </div>
    );
  },
);
