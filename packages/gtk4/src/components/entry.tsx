import React, { forwardRef, type InputHTMLAttributes, useCallback } from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps, type GtkInputPurpose } from "../types.ts";

export interface GtkEntryProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type">,
    GtkAlignProps {
  /** Current text value. */
  text?: string;
  /** Placeholder text when empty. */
  placeholderText?: string;
  /** Whether text is visible (false = password mode). Default: true. */
  visibility?: boolean;
  /** Whether the entry has a visible frame. Default: true. */
  hasFrame?: boolean;
  /** Maximum number of characters. 0 = unlimited. Default: 0. */
  maxLength?: number;
  /** Input purpose hint. Default: "free-form". */
  inputPurpose?: GtkInputPurpose;
  /** Whether pressing Enter activates the default widget. */
  activatesDefault?: boolean;
  /** Primary (left) icon name. */
  primaryIconName?: string;
  /** Secondary (right) icon name. */
  secondaryIconName?: string;
  /** Progress fraction (0.0-1.0). 0 hides the progress bar. */
  progressFraction?: number;
  /** Callback when text changes. */
  onChanged?: (text: string) => void;
  /** Callback when Enter is pressed. */
  onActivate?: () => void;
  /** Callback when primary icon is clicked. */
  onIconPress?: (position: "primary" | "secondary") => void;
}

const purposeToInputType: Record<GtkInputPurpose, string> = {
  "free-form": "text",
  alpha: "text",
  digits: "text",
  number: "number",
  phone: "tel",
  url: "url",
  email: "email",
  name: "text",
  password: "password",
  pin: "text",
};

/**
 * GtkEntry — A single-line text input widget.
 *
 * CSS node:
 *   entry[.flat]
 *     ├── image.left (primary icon)
 *     ├── text
 *     ├── image.right (secondary icon)
 *     └── progress > trough > progress (optional)
 *
 * @see https://docs.gtk.org/gtk4/class.Entry.html
 */
export const GtkEntry = forwardRef<HTMLInputElement, GtkEntryProps>(function GtkEntry(
  {
    text,
    placeholderText,
    visibility = true,
    hasFrame = true,
    maxLength = 0,
    inputPurpose = "free-form",
    activatesDefault = false,
    primaryIconName,
    secondaryIconName,
    progressFraction = 0,
    onChanged,
    onActivate,
    onIconPress,
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
  const PrimaryIcon = useIcon(primaryIconName ?? "");
  const SecondaryIcon = useIcon(secondaryIconName ?? "");

  const classes = ["gtk-entry"];
  if (!hasFrame) classes.push("flat");
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
      if (e.key === "Enter") {
        onActivate?.();
      }
      onKeyDown?.(e);
    },
    [onActivate, onKeyDown],
  );

  const inputType = !visibility ? "password" : purposeToInputType[inputPurpose];

  return (
    <div className={classes.join(" ")} {...alignAttrs(halign, valign, hexpand, vexpand)}>
      {PrimaryIcon && (
        <span className="gtk-image left" onClick={() => onIconPress?.("primary")}>
          <PrimaryIcon size={16} />
        </span>
      )}
      <input
        ref={ref}
        className="gtk-text"
        type={inputType}
        value={text}
        placeholder={placeholderText}
        maxLength={maxLength > 0 ? maxLength : undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...rest}
      />
      {SecondaryIcon && (
        <span className="gtk-image right" onClick={() => onIconPress?.("secondary")}>
          <SecondaryIcon size={16} />
        </span>
      )}
      {progressFraction > 0 && (
        <div className="gtk-progress">
          <div className="gtk-trough">
            <div className="gtk-progress" style={{ width: `${progressFraction * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
});
