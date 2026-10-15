import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import {
  alignAttrs,
  centerSlotAttrs,
  type GtkAlignProps,
  type GtkBaselinePosition,
  type GtkOrientation,
} from "../types.ts";

export interface GtkCenterBoxProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Baseline alignment position. Default: "center". */
  baselinePosition?: GtkBaselinePosition;
  /** Start-side widget (left in LTR). */
  startWidget?: ReactNode;
  /** Center widget (truly centered). */
  centerWidget?: ReactNode;
  /** End-side widget (right in LTR). */
  endWidget?: ReactNode;
}

/**
 * GtkCenterBox — A container with three children: start, center, end.
 *
 * The center widget is truly centered relative to the full width,
 * regardless of start/end sizes. Wraps the existing CenterLayout.
 *
 * CSS node: box (same as GtkBox, uses CenterLayout internally)
 *
 * @see https://docs.gtk.org/gtk4/class.CenterBox.html
 */
export const GtkCenterBox = forwardRef<HTMLDivElement, GtkCenterBoxProps>(function GtkCenterBox(
  {
    orientation = "horizontal",
    baselinePosition = "center",
    startWidget,
    centerWidget,
    endWidget,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-box", "gtk-center-layout", orientation];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...centerSlotAttrs(startWidget, centerWidget, endWidget)}
      {...rest}
    >
      <div className="gtk-center-layout-start">{startWidget}</div>
      <div className="gtk-center-layout-center">{centerWidget}</div>
      <div className="gtk-center-layout-end">{endWidget}</div>
    </div>
  );
});
