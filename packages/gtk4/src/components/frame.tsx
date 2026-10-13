import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkFrameProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Simple text label. Ignored if labelWidget is set. */
  label?: string;
  /** Custom widget displayed as the frame label. */
  labelWidget?: ReactNode;
  /** Horizontal alignment of the label (0.0 left to 1.0 right). Default: 0. */
  labelXalign?: number;
  /** Main content. */
  children?: ReactNode;
}

/**
 * GtkFrame — A decorative frame with an optional label.
 *
 * CSS node:
 *   frame
 *     ├── <label widget>
 *     └── <child>
 *
 * Adwaita: 1px border, 12px border-radius, label margin 4px.
 * Overflow: hidden (clips children to border-radius).
 *
 * @see https://docs.gtk.org/gtk4/class.Frame.html
 */
export const GtkFrame = forwardRef<HTMLDivElement, GtkFrameProps>(function GtkFrame(
  {
    label,
    labelWidget,
    labelXalign = 0,
    children,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-frame"];
  if (className) classes.push(className);

  const labelContent = labelWidget ?? (label ? <span className="gtk-label">{label}</span> : null);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={{ overflow: "clip", ...style }}
      {...rest}
    >
      {labelContent && (
        <div
          style={{ textAlign: labelXalign === 0 ? "start" : labelXalign === 1 ? "end" : "center" }}
        >
          {labelContent}
        </div>
      )}
      {children}
    </div>
  );
});
