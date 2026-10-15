import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { alignAttrs, type GtkAlignProps, type GtkOrientation, spacingStyle } from "../types.ts";

export interface GtkBoxProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Spacing between children in pixels. Default: 0. */
  spacing?: number;
  /** Whether all children get equal space. Default: false. */
  homogeneous?: boolean;
  children?: ReactNode;
}

/**
 * GtkBox — A container that arranges children in a single row or column.
 *
 * Uses GtkBoxLayout internally.
 *
 * CSS node: box[.horizontal|.vertical]
 *
 * @see https://docs.gtk.org/gtk4/class.Box.html
 */
export const GtkBox = forwardRef<HTMLDivElement, GtkBoxProps>(function GtkBox(
  {
    orientation = "horizontal",
    spacing = 0,
    homogeneous = false,
    children,
    halign,
    valign,
    className,
    style,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-box", "gtk-box-layout", orientation];
  if (homogeneous) classes.push("homogeneous");
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign)}
      style={{ ...spacingStyle(spacing), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
});
