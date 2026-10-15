import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { centerSlotAttrs, type GtkOrientation } from "../types.ts";

export interface GtkCenterLayoutProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: GtkOrientation;
  /** Start-side content. */
  start?: ReactNode;
  /** Center content. */
  center?: ReactNode;
  /** End-side content. */
  end?: ReactNode;
}

/**
 * GtkCenterLayout — Arranges three children: start, center, end.
 *
 * The center child is truly centered relative to the full width,
 * with start/end on the sides. Used by GtkCenterBox and internally
 * by GtkHeaderBar.
 *
 * @see https://docs.gtk.org/gtk4/class.CenterLayout.html
 */
export const GtkCenterLayout = forwardRef<HTMLDivElement, GtkCenterLayoutProps>(
  function GtkCenterLayout(
    { orientation = "horizontal", start, center, end, className, children, ...rest },
    ref,
  ) {
    const classes = ["gtk-center-layout", orientation];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        {...centerSlotAttrs(start, center ?? children, end)}
        {...rest}
      >
        <div className="gtk-center-layout-start">{start}</div>
        <div className="gtk-center-layout-center">{center ?? children}</div>
        <div className="gtk-center-layout-end">{end}</div>
      </div>
    );
  },
);
