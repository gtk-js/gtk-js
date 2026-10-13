import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkCheckButtonProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether the check/radio is active. */
  active?: boolean;
  /** Text label displayed next to the indicator. */
  label?: string;
  /** Whether to show an indeterminate/dash state. */
  inconsistent?: boolean;
  /** Custom child widget (replaces label). */
  children?: ReactNode;
  /** Group name — buttons with the same group act as radio buttons. */
  group?: string;
  /** Callback when active state changes. */
  onToggled?: (active: boolean) => void;
}

/**
 * GtkCheckButton — A checkbox or radio button widget.
 *
 * CSS node:
 *   checkbutton[.text-button][.grouped]
 *     ├── check (or radio if grouped)
 *     └── [label]
 *
 * Uses BoxLayout (horizontal flex with 4px gap).
 *
 * @see https://docs.gtk.org/gtk4/class.CheckButton.html
 */
export const GtkCheckButton = forwardRef<HTMLDivElement, GtkCheckButtonProps>(
  function GtkCheckButton(
    {
      active: controlledActive,
      label,
      inconsistent = false,
      children,
      group,
      onToggled,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onClick,
      ...rest
    },
    ref,
  ) {
    const isControlled = controlledActive !== undefined;
    const [internalActive, setInternalActive] = useState(false);
    const active = isControlled ? controlledActive : internalActive;

    const isGrouped = group != null;
    const hasLabel = label != null && children == null;

    const classes = ["gtk-checkbutton", "gtk-box-layout", "horizontal"];
    if (hasLabel) classes.push("text-button");
    if (isGrouped) classes.push("grouped");
    if (className) classes.push(className);

    const indicatorClass = isGrouped ? "gtk-radio" : "gtk-check";

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        // Radio: can only activate, not deactivate
        if (isGrouped && active) {
          onClick?.(e);
          return;
        }
        const newActive = !active;
        if (!isControlled) setInternalActive(newActive);
        onToggled?.(newActive);
        onClick?.(e);
      },
      [active, isControlled, isGrouped, onToggled, onClick],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      },
      [handleClick],
    );

    return (
      <div
        ref={ref}
        role={isGrouped ? "radio" : "checkbox"}
        aria-checked={inconsistent ? "mixed" : active}
        tabIndex={0}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        data-checked={active || undefined}
        data-indeterminate={inconsistent || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        <span
          className={indicatorClass}
          data-checked={active || undefined}
          data-indeterminate={inconsistent || undefined}
        />
        {children ?? (hasLabel && <span className="gtk-label">{label}</span>)}
      </div>
    );
  },
);
