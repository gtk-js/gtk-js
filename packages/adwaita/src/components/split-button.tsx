import type { GtkArrowType } from "@gtk-js/gtk4";
import { tooltipAttrs, useIcon } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode, useState } from "react";

export interface AdwSplitButtonProps extends Omit<HTMLAttributes<HTMLDivElement>, "popover"> {
  /** Text label for the action button. */
  label?: string;
  /** Icon name for the action button. */
  iconName?: string;
  /** Custom child widget (replaces label/icon). */
  child?: ReactNode;
  /** Popover content shown by the dropdown button. */
  popover?: ReactNode;
  /** Arrow direction. Default: "down". */
  direction?: GtkArrowType;
  /** Tooltip for the dropdown button. */
  dropdownTooltip?: string;
  /** Whether the label can shrink. Default: false. */
  canShrink?: boolean;
  /** Callback when the action button is clicked. */
  onClicked?: () => void;
}

/**
 * AdwSplitButton — An action button with a linked dropdown.
 *
 * CSS node:
 *   splitbutton[.image-button][.text-button]
 *     ├── button (action)
 *     ├── separator (vertical)
 *     └── menubutton > button.toggle > arrow
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.SplitButton.html
 */
export const AdwSplitButton = forwardRef<HTMLDivElement, AdwSplitButtonProps>(
  function AdwSplitButton(
    {
      label,
      iconName,
      child,
      popover,
      direction = "down",
      dropdownTooltip = "More Options",
      canShrink = false,
      onClicked,
      className,
      ...rest
    },
    ref,
  ) {
    const [menuOpen, setMenuOpen] = useState(false);
    const ArrowIcon = useIcon("PanDown");
    const ContentIcon = useIcon(iconName ?? "");

    const hasLabel = label != null && child == null;
    const hasIcon = iconName != null && child == null;

    const rootClasses = ["gtk-splitbutton", "gtk-box-layout", "horizontal"];
    if (hasLabel) rootClasses.push("text-button");
    if (hasIcon) rootClasses.push("image-button");
    if (className) rootClasses.push(className);

    return (
      <div ref={ref} className={rootClasses.join(" ")} {...rest}>
        <button type="button" className="gtk-button" onClick={() => onClicked?.()}>
          {child ?? (
            <>
              {ContentIcon && (
                <span className="gtk-image">
                  <ContentIcon size={16} />
                </span>
              )}
              {hasLabel && (
                <span
                  className="gtk-label"
                  style={canShrink ? { overflow: "hidden", textOverflow: "ellipsis" } : undefined}
                >
                  {label}
                </span>
              )}
            </>
          )}
        </button>
        <div className="gtk-separator vertical" />
        <div className="gtk-menubutton">
          <button
            type="button"
            className={`gtk-button toggle ${menuOpen ? "has-open-popup" : ""}`}
            {...tooltipAttrs(dropdownTooltip)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            data-checked={menuOpen || undefined}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className={`gtk-arrow ${direction}`}>{ArrowIcon && <ArrowIcon size={16} />}</span>
          </button>
          {menuOpen && popover && (
            <div className="gtk-popover background menu">
              <div className="gtk-contents">{popover}</div>
            </div>
          )}
        </div>
      </div>
    );
  },
);
