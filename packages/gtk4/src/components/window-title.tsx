import { type CSSProperties, forwardRef, type HTMLAttributes } from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkWindowTitleProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** The main title text. */
  title: string;
  /** Optional subtitle text displayed below the title. */
  subtitle?: string;
}

// Block (not the default inline-flex): text-overflow only applies to blocks.
// The labels stretch to the grid track, padding (12px a side in the theme)
// included, and center their text, so a shrunk title ellipsizes within it.
const LABEL_STYLE: CSSProperties = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
};

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
  function GtkWindowTitle({ title, subtitle, halign, valign, className, ...rest }, ref) {
    const classes = ["gtk-windowtitle"];
    if (className) classes.push(className);

    // AdwWindowTitle's labels are single-line and ellipsize, and the title has
    // width-chars=5: the widget's minimum width is five characters (plus the
    // labels' padding) while its natural width is the full text. A grid track
    // with a fixed minimum reproduces that min/natural split, so a long title
    // ellipsizes instead of forcing the header bar wider than the window.
    const minWidth = title ? "calc(5ch + 24px)" : "0px";

    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign)}
        style={{
          display: "grid",
          gridTemplateColumns: `minmax(${minWidth}, max-content)`,
          alignContent: "center",
        }}
        {...rest}
      >
        {title && (
          <span className="gtk-label title" style={LABEL_STYLE}>
            {title}
          </span>
        )}
        {subtitle && (
          <span className="gtk-label subtitle" style={LABEL_STYLE}>
            {subtitle}
          </span>
        )}
      </div>
    );
  },
);
