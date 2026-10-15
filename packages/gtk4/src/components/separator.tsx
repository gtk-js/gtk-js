import { forwardRef, type HTMLAttributes } from "react";
import { alignAttrs, type GtkAlignProps, type GtkOrientation } from "../types.ts";

export interface GtkSeparatorProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Separator direction. Default: "horizontal". */
  orientation?: GtkOrientation;
}

/**
 * GtkSeparator — A visual separator between widgets.
 *
 * CSS node: separator[.horizontal|.vertical]
 *
 * @see https://docs.gtk.org/gtk4/class.Separator.html
 */
export const GtkSeparator = forwardRef<HTMLDivElement, GtkSeparatorProps>(function GtkSeparator(
  { orientation = "horizontal", halign, valign, hexpand, vexpand, className, ...rest },
  ref,
) {
  const classes = ["gtk-separator", orientation];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    />
  );
});
