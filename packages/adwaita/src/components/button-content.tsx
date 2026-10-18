import { useIcon } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes } from "react";

export interface AdwButtonContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Text label. */
  label?: string;
  /** Icon name from icon theme. */
  iconName?: string;
  /** Whether underscores indicate mnemonics. Default: false. */
  useUnderline?: boolean;
  /** Whether the label can ellipsize. Default: false. */
  canShrink?: boolean;
  /** Whether the content is insensitive (GtkWidget:sensitive is false), as in an insensitive button. Default: false. */
  disabled?: boolean;
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
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ButtonContent.html
 */
export const AdwButtonContent = forwardRef<HTMLDivElement, AdwButtonContentProps>(
  function AdwButtonContent(
    {
      label,
      iconName,
      useUnderline = false,
      canShrink = false,
      disabled = false,
      className,
      ...rest
    },
    ref,
  ) {
    const Icon = useIcon(iconName ?? "");
    // GTK makes the children of an insensitive widget insensitive too.
    const insensitive = disabled || undefined;

    const classes = ["gtk-buttoncontent", "gtk-bin-layout"];
    if (className) classes.push(className);

    return (
      <div ref={ref} className={classes.join(" ")} data-disabled={insensitive} {...rest}>
        <div className="gtk-box gtk-box-layout horizontal" data-disabled={insensitive}>
          {Icon && (
            <span className="gtk-image" data-disabled={insensitive}>
              <Icon size={16} />
            </span>
          )}
          {label && (
            <span
              className="gtk-label"
              data-disabled={insensitive}
              style={{
                fontWeight: "bold",
                ...(canShrink
                  ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
                  : {}),
              }}
            >
              {label}
            </span>
          )}
        </div>
      </div>
    );
  },
);
