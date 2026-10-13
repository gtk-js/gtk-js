import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { alignAttrs, centerSlotAttrs, type GtkAlignProps } from "../types.ts";

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
 * @see https://docs.gtk.org/gtk4/class.ActionBar.html
 */
export const GtkActionBar = forwardRef<HTMLDivElement, GtkActionBarProps>(function GtkActionBar(
  { revealed = true, start, end, centerWidget, halign, valign, className, ...rest },
  ref,
) {
  const classes = ["gtk-actionbar"];
  if (className) classes.push(className);

  if (!revealed) {
    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign)}
        style={{ display: "none" }}
        {...rest}
      />
    );
  }

  return (
    <div ref={ref} className={classes.join(" ")} {...alignAttrs(halign, valign)} {...rest}>
      <div className="gtk-revealer">
        {/* The start and end boxes always exist, as in GtkActionBar. */}
        <div className="gtk-box gtk-center-layout" {...centerSlotAttrs(true, centerWidget, true)}>
          <div className="gtk-box gtk-box-layout horizontal start gtk-center-layout-start">
            {start}
          </div>
          <div className="gtk-center-layout-center">{centerWidget}</div>
          <div className="gtk-box gtk-box-layout horizontal end gtk-center-layout-end">{end}</div>
        </div>
      </div>
    </div>
  );
});
