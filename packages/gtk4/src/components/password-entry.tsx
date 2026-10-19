import React, { forwardRef, type InputHTMLAttributes, useCallback, useState } from "react";
import { useIcon } from "../icon-context.tsx";
import { tooltipAttrs } from "../tooltip.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkPasswordEntryProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type">,
    GtkAlignProps {
  /** Placeholder text. */
  placeholderText?: string;
  /** Whether to show the peek (show/hide) icon. Default: false. */
  showPeekIcon?: boolean;
  /** Whether pressing Enter activates the default widget. */
  activatesDefault?: boolean;
  /** Callback when text changes. */
  onChanged?: (text: string) => void;
  /** Callback when Enter is pressed. */
  onActivate?: () => void;
}

/**
 * GtkPasswordEntry — A password text entry.
 *
 * CSS node: entry.password
 *   ├── text
 *   ├── image.caps-lock-indicator (when caps lock on + text hidden)
 *   └── image (peek icon: view-reveal/view-conceal)
 *
 * @see https://docs.gtk.org/gtk4/class.PasswordEntry.html
 */
export const GtkPasswordEntry = forwardRef<HTMLInputElement, GtkPasswordEntryProps>(
  function GtkPasswordEntry(
    {
      placeholderText,
      showPeekIcon = false,
      activatesDefault = false,
      onChanged,
      onActivate,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onChange,
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    const RevealIcon = useIcon("ViewReveal");
    const ConcealIcon = useIcon("ViewConceal");
    const CapsLockIcon = useIcon("CapsLock");

    const PeekIcon = visible ? ConcealIcon : RevealIcon;

    const classes = ["gtk-entry", "password"];
    if (className) classes.push(className);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChanged?.(e.target.value);
        onChange?.(e);
      },
      [onChanged, onChange],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        setCapsLock(e.getModifierState("CapsLock"));
        if (e.key === "Enter") onActivate?.();
        onKeyDown?.(e);
      },
      [onActivate, onKeyDown],
    );

    const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      setCapsLock(e.getModifierState("CapsLock"));
    }, []);

    const toggleVisibility = useCallback(() => {
      setVisible((v) => !v);
    }, []);

    return (
      <div className={classes.join(" ")} {...alignAttrs(halign, valign, hexpand, vexpand)}>
        <input
          ref={ref}
          className="gtk-text"
          type={visible ? "text" : "password"}
          placeholder={placeholderText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          {...rest}
        />
        {capsLock && !visible && CapsLockIcon && (
          <span className="gtk-image caps-lock-indicator" {...tooltipAttrs("Caps Lock is on")}>
            <CapsLockIcon size={16} />
          </span>
        )}
        {showPeekIcon && PeekIcon && (
          <span
            className="gtk-image"
            onClick={toggleVisibility}
            {...tooltipAttrs(visible ? "Hide Text" : "Show Text")}
          >
            <PeekIcon size={16} />
          </span>
        )}
      </div>
    );
  },
);
