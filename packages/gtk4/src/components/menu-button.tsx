import { forwardRef, type HTMLAttributes, type ReactNode, useCallback, useState } from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps, type GtkArrowType } from "../types.ts";

export interface GtkMenuButtonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "popover">,
    GtkAlignProps {
  /** Popover content to show when clicked. */
  popover?: ReactNode;
  /** Icon name for the button. */
  iconName?: string;
  /** Text label for the button. */
  label?: string;
  /** Arrow direction. Default: "down". */
  direction?: GtkArrowType;
  /** Whether the button has a visible frame. Default: true. */
  hasFrame?: boolean;
  /** Custom child widget (replaces label/icon). */
  children?: ReactNode;
  /** Whether the dropdown arrow is always shown. Default: false. */
  alwaysShowArrow?: boolean;
  /** Whether the label can shrink. Default: false. */
  canShrink?: boolean;
  /** Whether this is a primary menu button (opens on F10). Default: false. */
  primary?: boolean;
  /** Disables the button. */
  disabled?: boolean;
}

const arrowIconMap: Record<GtkArrowType, string> = {
  none: "OpenMenu",
  up: "PanUp",
  down: "PanDown",
  left: "PanStart",
  right: "PanEnd",
};

/**
 * GtkMenuButton — A button that shows a popover when clicked.
 *
 * CSS node:
 *   menubutton
 *     └── button.toggle
 *         ├── [label|image|child]
 *         └── arrow
 *
 * @see https://docs.gtk.org/gtk4/class.MenuButton.html
 */
export const GtkMenuButton = forwardRef<HTMLDivElement, GtkMenuButtonProps>(function GtkMenuButton(
  {
    popover,
    iconName,
    label,
    direction = "down",
    hasFrame = true,
    children,
    alwaysShowArrow = false,
    canShrink = false,
    primary = false,
    disabled,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useState(false);

  const ArrowIcon = useIcon(arrowIconMap[direction] ?? "PanDown");
  const ContentIcon = useIcon(iconName ?? "");

  const hasCustomChild = children != null;
  const hasLabel = label != null && !hasCustomChild;
  const hasIcon = iconName != null && !hasCustomChild;
  const arrowOnly = !hasCustomChild && !hasLabel && !hasIcon;
  const showArrow = arrowOnly || alwaysShowArrow || hasLabel;

  const rootClasses = ["gtk-menubutton"];
  if (className) rootClasses.push(className);

  const btnClasses = ["gtk-button", "toggle"];
  if (!hasFrame) btnClasses.push("flat");
  if (arrowOnly || hasIcon) btnClasses.push("image-button");
  if (hasLabel) btnClasses.push("text-button");
  if (showArrow && !arrowOnly) btnClasses.push("arrow-button");
  if (open) btnClasses.push("has-open-popup");

  const toggle = useCallback(() => {
    if (!disabled) setOpen((o) => !o);
  }, [disabled]);

  return (
    <div
      ref={ref}
      className={rootClasses.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      <button
        type="button"
        className={btnClasses.join(" ")}
        aria-haspopup="true"
        aria-expanded={open}
        data-checked={open || undefined}
        disabled={disabled}
        onClick={toggle}
      >
        {hasCustomChild ? (
          <div className="gtk-bin-layout">{children}</div>
        ) : (
          <>
            {hasIcon && ContentIcon && (
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
        {showArrow && ArrowIcon && (
          <span className={`gtk-arrow ${direction}`}>
            <ArrowIcon size={16} />
          </span>
        )}
      </button>
      {open && popover && (
        <div className="gtk-popover background menu">
          <div className="gtk-contents">{popover}</div>
        </div>
      )}
    </div>
  );
});
