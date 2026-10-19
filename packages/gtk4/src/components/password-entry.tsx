import React, {
  forwardRef,
  type InputHTMLAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkPasswordEntryProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type">,
    GtkAlignProps {
  /** Placeholder text. */
  placeholderText?: string;
  /** Whether to show the peek (show/hide) icon. Turning it off hides the text again. Default: false. */
  showPeekIcon?: boolean;
  /** Whether pressing Enter activates the default widget (the dialog's or window's `.default` button). */
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
 *   ├── image.caps-lock-indicator (when caps lock on + text focused and hidden)
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
      disabled,
      readOnly,
      onChange,
      onKeyDown,
      onKeyUp,
      onMouseDown,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const selection = useRef<[number, number, "forward" | "backward" | "none"] | null>(null);

    // gtk_password_entry_set_show_peek_icon(FALSE) also hides the text again.
    if (!showPeekIcon && visible) setVisible(false);

    const RevealIcon = useIcon("ViewReveal");
    const ConcealIcon = useIcon("ViewConceal");
    const CapsLockIcon = useIcon("CapsLock");

    const PeekIcon = visible ? ConcealIcon : RevealIcon;

    // Like caps_lock_state_changed(): only while the text is editable, focused and hidden.
    const showCapsLock = capsLock && focused && !visible && !readOnly && !disabled;

    const classes = ["gtk-entry", "password"];
    if (className) classes.push(className);

    const setRef = useCallback(
      (el: HTMLInputElement | null) => {
        inputRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref],
    );

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
        if (e.key === "Enter") {
          onActivate?.();
          // Like gtk_text_real_activate() → gtk_widget_activate_default(): the
          // window's default widget, which GTK marks with the .default class.
          if (activatesDefault) {
            e.currentTarget
              .closest(".gtk-dialog, .gtk-window")
              ?.querySelector<HTMLButtonElement>("button.default:not(:disabled)")
              ?.click();
          }
        }
        onKeyDown?.(e);
      },
      [onActivate, activatesDefault, onKeyDown],
    );

    const handleKeyUp = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        setCapsLock(e.getModifierState("CapsLock"));
        onKeyUp?.(e);
      },
      [onKeyUp],
    );

    // A click that focuses the text reads the Caps Lock state, as focus_changed()
    // re-checks it; focusing with Tab reads it on the Tab key's release.
    const handleInputMouseDown = useCallback(
      (e: React.MouseEvent<HTMLInputElement>) => {
        setCapsLock(e.getModifierState("CapsLock"));
        onMouseDown?.(e);
      },
      [onMouseDown],
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    // Like the entry's catch-all click gesture and the peek icon's, which claim
    // the press: clicking outside the text doesn't take the focus away from it.
    const handleEntryMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== inputRef.current) e.preventDefault();
    }, []);

    const toggleVisibility = useCallback(() => {
      // gtk_text_set_visibility() keeps the cursor and selection, but browsers
      // reset them when an input's type changes: restore them after the switch.
      const input = inputRef.current;
      if (input && input === document.activeElement && input.selectionStart !== null) {
        selection.current = [
          input.selectionStart,
          input.selectionEnd ?? input.selectionStart,
          input.selectionDirection ?? "none",
        ];
      }
      setVisible((v) => !v);
    }, []);

    useLayoutEffect(() => {
      const input = inputRef.current;
      const range = selection.current;
      selection.current = null;
      if (!input || !range || input !== document.activeElement) return;
      // Chromium resets the selection on the first layout after the switch.
      void input.offsetWidth;
      input.setSelectionRange(...range);
    }, [visible]);

    return (
      <div
        className={classes.join(" ")}
        data-disabled={disabled || undefined}
        onMouseDown={handleEntryMouseDown}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
      >
        <input
          ref={setRef}
          className="gtk-text"
          type={visible ? "text" : "password"}
          placeholder={placeholderText}
          disabled={disabled}
          readOnly={readOnly}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onMouseDown={handleInputMouseDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {showCapsLock && CapsLockIcon && (
          <span className="gtk-image caps-lock-indicator" role="alert" title="Caps Lock is on">
            <CapsLockIcon size={16} />
          </span>
        )}
        {showPeekIcon && PeekIcon && (
          <span
            className="gtk-image"
            onClick={disabled ? undefined : toggleVisibility}
            title={visible ? "Hide Text" : "Show Text"}
          >
            <PeekIcon size={16} />
          </span>
        )}
      </div>
    );
  },
);
