import { GtkImage, GtkLabel } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes } from "react";
import { stripMnemonic } from "../mnemonic.ts";

export interface AdwButtonContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Text label. */
  label?: string;
  /** Icon name from icon theme. Like libadwaita, an empty or unknown name shows the missing-image icon. */
  iconName?: string;
  /** Whether underscores indicate mnemonics. Default: false. */
  useUnderline?: boolean;
  /** Whether the label can ellipsize. Default: false. */
  canShrink?: boolean;
}

/**
 * AdwButtonContent — An icon + label widget for use inside buttons.
 *
 * CSS node:
 *   buttoncontent
 *     └── box
 *         ├── image
 *         └── label (bold, hidden when empty)
 *
 * The button it's in gets the .image-text-button style class (the split
 * button, in an AdwSplitButton).
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ButtonContent.html
 */
export const AdwButtonContent = Object.assign(
  forwardRef<HTMLDivElement, AdwButtonContentProps>(function AdwButtonContent(
    {
      label = "",
      iconName = "",
      useUnderline = false,
      canShrink = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const classes = ["gtk-buttoncontent", "gtk-bin-layout"];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        role="group"
        className={classes.join(" ")}
        // An ellipsizing label lets it shrink, to the width it's given.
        style={canShrink ? { minWidth: 0, ...style } : style}
        {...rest}
      >
        <div
          className="gtk-box gtk-box-layout horizontal"
          data-halign="center"
          style={canShrink ? { minWidth: 0, maxWidth: "100%" } : undefined}
        >
          {/* An empty name shows image-missing (adw_button_content_set_icon_name()). */}
          <GtkImage iconName={iconName || "MissingIcon"} valign="center" />
          {label && (
            <GtkLabel
              label={useUnderline ? stripMnemonic(label) : label}
              ellipsize={canShrink ? "end" : "none"}
            />
          )}
        </div>
      </div>
    );
  }),
  {
    /** Read by GtkButton: the class AdwButtonContent gives it (adw_button_content_root()). */
    gtkButtonClass: "image-text-button",
  },
);
