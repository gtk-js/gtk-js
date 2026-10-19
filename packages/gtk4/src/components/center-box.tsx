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
  /**
   * Where baseline-aligned children go when the box is taller than they need.
   * Default: "center".
   */
  baselinePosition?: GtkBaselinePosition;
  /**
   * Whether the center widget shrinks only after the start and end widgets
   * have shrunk to their minimum. Default: true.
   */
  shrinkCenterLast?: boolean;
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
 * regardless of start/end sizes. Lays out its children with GtkCenterLayout.
 *
 * CSS node: box, with the start, center and end widgets as its children
 * (gtk_center_box_set_start_widget())
 *
 * @see https://docs.gtk.org/gtk4/class.CenterBox.html
 */
export const GtkCenterBox = forwardRef<HTMLDivElement, GtkCenterBoxProps>(function GtkCenterBox(
  {
    orientation = "horizontal",
    baselinePosition = "center",
    shrinkCenterLast = true,
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
  // Only a changed orientation adds its class (gtk_widget_update_orientation()).
  const classes = ["gtk-box", "gtk-center-layout"];
  if (orientation === "vertical") classes.push("vertical");
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...centerSlotAttrs(startWidget, centerWidget, endWidget)}
      data-baseline-position={baselinePosition === "center" ? undefined : baselinePosition}
      data-shrink-center-last={shrinkCenterLast ? undefined : "false"}
      {...rest}
    >
      {startWidget}
      {centerWidget}
      {endWidget}
    </div>
  );
});
