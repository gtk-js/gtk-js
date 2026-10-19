import {
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
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
 * Layout (gtk_frame_size_allocate()): the label on top, placed at labelXalign
 * of the width it leaves free (mirrored in RTL), and the child in the rest.
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

  const labelText = labelWidget ?? label;
  // The label is a direct child of the frame (frame > label). It doesn't count
  // for the frame's expand (gtk_frame_compute_expand()), and layout.css puts
  // it in the label row by the same attribute.
  const labelContent = isValidElement(labelText) ? (
    cloneElement(labelText as ReactElement<Record<string, unknown>>, { "data-expand-ignored": "" })
  ) : labelText ? (
    <span className="gtk-label" data-expand-ignored="">
      {labelText}
    </span>
  ) : null;

  // label-xalign is clamped to [0, 1] (gtk_frame_set_label_align()). The free
  // width goes either side of the label in that ratio; grid columns flip in
  // RTL, as GTK uses 1 - xalign there.
  const xalign = Math.min(Math.max(labelXalign, 0), 1);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={{
        overflow: "clip",
        gridTemplateColumns: `${xalign}fr auto ${1 - xalign}fr`,
        ...style,
      }}
      {...rest}
    >
      {labelContent}
      {children}
    </div>
  );
});
