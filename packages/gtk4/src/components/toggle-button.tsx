import React, {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { childButtonClass } from "./button.tsx";

export interface GtkToggleButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    GtkAlignProps {
  /** Whether the button is pressed in. */
  active?: boolean;
  /** Text label. */
  label?: string;
  /** Icon name for the button. */
  iconName?: string;
  /** Whether the button has a visible frame. Default: true. */
  hasFrame?: boolean;
  /** Tooltip shown when hovering the button (GtkWidget:tooltip-text). */
  tooltipText?: string;
  /** Callback when toggle state changes. */
  onToggled?: (active: boolean) => void;
  /** Group reference — another GtkToggleButton ref for radio behavior. */
  group?: React.RefObject<HTMLButtonElement | null>;
  /** Custom child widget. */
  children?: ReactNode;
}

/**
 * GtkToggleButton — A button that retains its pressed state.
 *
 * CSS node: button.toggle[:checked]
 *
 * @see https://docs.gtk.org/gtk4/class.ToggleButton.html
 */
export const GtkToggleButton = forwardRef<HTMLButtonElement, GtkToggleButtonProps>(
  function GtkToggleButton(
    {
      active: controlledActive,
      label,
      iconName,
      hasFrame = true,
      tooltipText,
      onToggled,
      group,
      children,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onKeyDown,
      onKeyUp,
      onClick,
      ...rest
    },
    ref,
  ) {
    const isControlled = controlledActive !== undefined;
    const [internalActive, setInternalActive] = useState(false);
    const active = isControlled ? controlledActive : internalActive;
    const [keyboardActivating, setKeyboardActivating] = useState(false);

    const hasCustomChild = children != null;
    const hasLabel = !hasCustomChild && label != null;
    const hasIcon = !hasCustomChild && iconName != null;

    const classes = ["gtk-button", "toggle"];
    if (!hasFrame) classes.push("flat");
    if (hasLabel && !hasIcon) classes.push("text-button");
    if (hasIcon && !hasLabel) classes.push("image-button");
    if (hasIcon && hasLabel) classes.push("image-text-button");
    const childClass = childButtonClass(children);
    if (childClass) classes.push(childClass);
    if (keyboardActivating) classes.push("keyboard-activating");
    if (className) classes.push(className);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const newActive = !active;
        if (!isControlled) setInternalActive(newActive);
        onToggled?.(newActive);
        onClick?.(e);
      },
      [active, isControlled, onToggled, onClick],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === " " || e.key === "Enter") setKeyboardActivating(true);
        onKeyDown?.(e);
      },
      [onKeyDown],
    );

    const handleKeyUp = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === " " || e.key === "Enter") setKeyboardActivating(false);
        onKeyUp?.(e);
      },
      [onKeyUp],
    );

    return (
      <button
        ref={ref}
        className={classes.join(" ")}
        title={tooltipText}
        aria-pressed={active}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        data-checked={active || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        {...rest}
      >
        {hasCustomChild ? (
          children
        ) : (
          <>
            {hasIcon && <span className="gtk-image" />}
            {hasLabel && <span className="gtk-label">{label}</span>}
          </>
        )}
      </button>
    );
  },
);
