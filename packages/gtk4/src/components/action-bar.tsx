import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { GtkCenterBox } from "./center-box.tsx";
import { GtkRevealer } from "./revealer.tsx";

export interface GtkActionBarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether the action bar is visible. Default: true. */
  revealed?: boolean;
  /** Start-side widgets. */
  start?: ReactNode;
  /** End-side widgets. */
  end?: ReactNode;
  /** Center widget. */
  centerWidget?: ReactNode;
}

/**
 * GtkActionBar — A bar at the bottom with start/center/end children.
 *
 * CSS node:
 *   actionbar
 *     └── revealer
 *         └── box (CenterLayout)
 *             ├── box.start
 *             ├── [center widget]
 *             └── box.end
 *
 * `revealed` slides the bar in and out over 250ms (GtkRevealer, slide-up).
 *
 * @see https://docs.gtk.org/gtk4/class.ActionBar.html
 */
export const GtkActionBar = forwardRef<HTMLDivElement, GtkActionBarProps>(function GtkActionBar(
  {
    revealed = true,
    start,
    end,
    centerWidget,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-actionbar"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      {/* gtk_action_bar_set_revealed() slides the bar up and down, keeping its children. */}
      <GtkRevealer revealChild={revealed} transitionType="slide-up">
        {/* A GtkCenterBox whose start and end boxes always exist, as in GtkActionBar. */}
        <GtkCenterBox
          startWidget={<div className="gtk-box gtk-box-layout horizontal start">{start}</div>}
          centerWidget={centerWidget}
          endWidget={<div className="gtk-box gtk-box-layout horizontal end">{end}</div>}
        />
      </GtkRevealer>
    </div>
  );
});
