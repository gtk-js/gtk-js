import { forwardRef, type HTMLAttributes } from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkSpinnerProps extends HTMLAttributes<HTMLSpanElement>, GtkAlignProps {
  /** Whether the spinner is animating. Default: false. */
  spinning?: boolean;
  /** Whether the widget is insensitive (disabled). Default: false. */
  disabled?: boolean;
}

/**
 * GtkSpinner — A widget that shows a spinning animation.
 *
 * CSS node: spinner
 * Uses :checked pseudo-class when spinning (mapped to [data-checked] attribute).
 * Uses :disabled pseudo-class when insensitive (remapped to [data-disabled] attribute
 * by the CSS transform pipeline, since <span> does not support :disabled natively).
 * Animation: 1s linear infinite rotation (defined in Adwaita CSS via spin keyframe).
 * Visual: the theme's -gtk-icon-source, process-working-symbolic, at the icon
 * size (16px, gtk_spinner_measure()) and centered in the space the spinner
 * gets, like gtk_spinner_snapshot().
 *
 * @see https://docs.gtk.org/gtk4/class.Spinner.html
 * @see upstream/libadwaita/src/stylesheet/widgets/_spinner.scss
 */
export const GtkSpinner = forwardRef<HTMLSpanElement, GtkSpinnerProps>(function GtkSpinner(
  { spinning = false, disabled = false, halign, valign, hexpand, vexpand, className, ...rest },
  ref,
) {
  const Icon = useIcon("ProcessWorking");
  const classes = ["gtk-spinner"];
  if (className) classes.push(className);

  return (
    <span
      ref={ref}
      role="progressbar"
      aria-busy={spinning}
      aria-disabled={disabled || undefined}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-checked={spinning || undefined}
      data-disabled={disabled || undefined}
      {...rest}
    >
      {Icon && <Icon size={16} />}
    </span>
  );
});
