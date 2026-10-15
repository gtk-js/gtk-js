import { forwardRef, type HTMLAttributes } from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkWindowTitleProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** The main title text. */
  title: string;
  /** Optional subtitle text displayed below the title. */
  subtitle?: string;
}

/**
 * GtkWindowTitle — A title/subtitle widget for headerbars.
 *
 * CSS node:
 *   windowtitle
 *     ├── .title (label)
 *     └── .subtitle (label, optional)
 *
 * @see https://docs.gtk.org/gtk4/class.WindowTitle.html
 */
export const GtkWindowTitle = forwardRef<HTMLDivElement, GtkWindowTitleProps>(
  function GtkWindowTitle(
    { title, subtitle, halign, valign, hexpand, vexpand, className, ...rest },
    ref,
  ) {
    const classes = ["gtk-windowtitle"];
    if (className) classes.push(className);

    // The grid that ellipsizes the labels is in layout.css.
    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        {title && <span className="gtk-label title">{title}</span>}
        {subtitle && <span className="gtk-label subtitle">{subtitle}</span>}
      </div>
    );
  },
);
