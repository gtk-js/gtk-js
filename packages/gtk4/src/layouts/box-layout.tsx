import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { type GtkOrientation, spacingStyle } from "../types.ts";

export interface GtkBoxLayoutProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: GtkOrientation;
  spacing?: number;
  homogeneous?: boolean;
  children?: ReactNode;
}

/**
 * GtkBoxLayout — Arranges children in a single row or column.
 *
 * In native GTK this is a layout manager (not a widget), but we expose it
 * as a component for convenience. GtkBox composes this internally.
 *
 * @see https://docs.gtk.org/gtk4/class.BoxLayout.html
 */
export const GtkBoxLayout = forwardRef<HTMLDivElement, GtkBoxLayoutProps>(function GtkBoxLayout(
  {
    orientation = "horizontal",
    spacing = 0,
    homogeneous = false,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-box-layout", orientation];
  if (homogeneous) classes.push("homogeneous");
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      style={{ ...spacingStyle(spacing), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
});
