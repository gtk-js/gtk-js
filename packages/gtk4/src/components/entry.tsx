import React, {
  forwardRef,
  type InputHTMLAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  /** Whether the text can be edited. Default: true. */
  editable?: boolean;
  /** Whether the entry has a visible frame. Default: true. */
  hasFrame?: boolean;
  /** Maximum number of characters. 0 = unlimited. Default: 0. */
  maxLength?: number;
  /** Input purpose hint for on-screen keyboards. It doesn't change what can be typed. Default: "free-form". */
  inputPurpose?: GtkInputPurpose;
  /** Whether pressing Enter activates the window's or dialog's default button (`.default`). Default: false. */
  activatesDefault?: boolean;
  /** Primary icon name (on the left, on the right in RTL). */
  primaryIconName?: string;
  /** Secondary icon name (on the right, on the left in RTL). */
  secondaryIconName?: string;
  /** Progress fraction (0.0-1.0). 0 hides the progress bar. */
  progressFraction?: number;
  /** Callback when text changes. */
  onChanged?: (text: string) => void;
  /** Callback when Enter is pressed. */
  onActivate?: () => void;
  /** Callback when an icon is pressed. */
  onIconPress?: (position: "primary" | "secondary") => void;
  /** Callback when an icon is released after being pressed. */
  onIconRelease?: (position: "primary" | "secondary") => void;
}

/** GtkInputPurpose is an input method hint (gtk_entry_set_input_purpose()). */
const purposeToInputMode: Partial<
  Record<GtkInputPurpose, React.HTMLAttributes<HTMLInputElement>["inputMode"]>
> = {
  digits: "numeric",
  number: "decimal",
  phone: "tel",
  url: "url",
  email: "email",
  pin: "numeric",
};

const charCount = (s: string) => [...s].length;

/**
 * GtkEntryBuffer counts characters, not UTF-16 units, and cuts what an edit
 * inserts past max-length (gtk_entry_buffer_normal_insert_text()). Returns the
 * edited value and the caret after the insertion, or null if it fits.
 */
function limitInsertion(prev: string, next: string, maxLength: number) {
  if (maxLength <= 0 || charCount(next) <= maxLength) return null;
  const isLow = (s: string, i: number) => /[\uDC00-\uDFFF]/.test(s[i] ?? "");
  let start = 0;
  while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
  if (isLow(next, start)) start--;
  let end = 0;
  const maxEnd = Math.min(prev.length, next.length) - start;
  while (end < maxEnd && prev[prev.length - 1 - end] === next[next.length - 1 - end]) end++;
  if (end > 0 && isLow(next, next.length - end)) end--;
  const head = next.slice(0, start);
  const tail = next.slice(next.length - end);
  const room = Math.max(0, maxLength - charCount(head) - charCount(tail));
  const inserted = [...next.slice(start, next.length - end)].slice(0, room).join("");
  return { value: head + inserted + tail, caret: head.length + inserted.length };
}

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
    editable = true,
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
    onIconRelease,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    disabled,
    onChange,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const PrimaryIcon = useIcon(primaryIconName ?? "");
  const SecondaryIcon = useIcon(secondaryIconName ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const [rtl, setRtl] = useState(false);
  const value =
    text === undefined || maxLength <= 0 ? text : [...text].slice(0, maxLength).join("");
  const valueRef = useRef(value ?? "");
  if (value !== undefined) valueRef.current = value;

  // update_icon_style(): the icon on the left side is .left, in either direction.
  const hasIcons = !!(PrimaryIcon || SecondaryIcon);
  useLayoutEffect(() => {
    if (hasIcons && rootRef.current) setRtl(getComputedStyle(rootRef.current).direction === "rtl");
  });

  const classes = ["gtk-entry"];
  if (!hasFrame) classes.push("flat");
  if (className) classes.push(className);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const limited = limitInsertion(valueRef.current, input.value, maxLength);
      if (limited) {
        const unchanged = limited.value === valueRef.current;
        input.value = limited.value;
        input.setSelectionRange(limited.caret, limited.caret);
        if (unchanged) return;
      }
      valueRef.current = input.value;
      onChanged?.(input.value);
      onChange?.(e);
    },
    [maxLength, onChanged, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // GtkText binds activate to Return and KP_Enter without modifiers
      // (gtk_text_class_init()); an input method commits on Enter instead.
      const modified = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey;
      if (e.key === "Enter" && !modified && !e.nativeEvent.isComposing) {
        onActivate?.();
        // gtk_text_real_activate(): activates the window's or dialog's default widget.
        if (activatesDefault) {
          const root = e.currentTarget.closest(".gtk-dialog, .gtk-window");
          const buttons = root?.querySelectorAll<HTMLButtonElement>("button.default") ?? [];
          [...buttons]
            .find((b) => !b.disabled && b.closest(".gtk-dialog, .gtk-window") === root)
            ?.click();
        }
      }
      onKeyDown?.(e);
    },
    [activatesDefault, onActivate, onKeyDown],
  );

  // The icons' click gestures: icon-press on press, icon-release on release.
  const iconProps = (position: "primary" | "secondary") =>
    disabled
      ? {}
      : {
          onMouseDown: (e: React.MouseEvent) => {
            if (e.button === 0) onIconPress?.(position);
          },
          onMouseUp: (e: React.MouseEvent) => {
            if (e.button === 0) onIconRelease?.(position);
          },
        };
  const [leftSide, rightSide] = rtl ? ["right", "left"] : ["left", "right"];

  return (
    <div
      ref={rootRef}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-disabled={disabled || undefined}
      // The entry claims presses outside its text (catchall_click_press()):
      // they don't take the focus from it, or give it.
      onMouseDown={(e) => {
        if (!(e.target as Element).closest("input")) e.preventDefault();
      }}
    >
      {PrimaryIcon && (
        <span className={`gtk-image ${leftSide}`} {...iconProps("primary")}>
          <PrimaryIcon size={16} />
        </span>
      )}
      <input
        ref={ref}
        className="gtk-text"
        type={visibility ? "text" : "password"}
        inputMode={purposeToInputMode[inputPurpose]}
        value={value}
        placeholder={placeholderText}
        readOnly={!editable}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...rest}
      />
      {SecondaryIcon && (
        <span className={`gtk-image ${rightSide}`} {...iconProps("secondary")}>
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
