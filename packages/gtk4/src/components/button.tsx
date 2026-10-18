import {
  type ButtonHTMLAttributes,
  forwardRef,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useWidgetActivate } from "../mnemonic.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { GtkBox } from "./box.tsx";
import { GtkImage } from "./image.tsx";
import { GtkLabel } from "./label.tsx";

/** How long a keyboard activation shows the button pressed at most (gtkbutton.c). */
const ACTIVATE_TIMEOUT = 250;

/** Space and Enter emit the activate signal (activate_keyvals, without modifiers). */
function isActivateKey(e: KeyboardEvent) {
  return e.key === " " || e.key === "Enter";
}

export interface GtkButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    GtkAlignProps {
  /** Text label displayed in the button. Creates an internal GtkLabel. */
  label?: string;
  /** Icon name for the button. Creates an internal GtkImage. */
  iconName?: string;
  /** Whether the button has a visible frame. When false, adds the .flat class. */
  hasFrame?: boolean;
  /** Whether the button can be smaller than its label, which then ellipsizes. Default: false. */
  canShrink?: boolean;
  /** Whether an underscore in the label marks its mnemonic: Alt with that key activates the button. */
  useUnderline?: boolean;
  /** Whether the button is insensitive (GtkWidget:sensitive = false). Default: false. */
  disabled?: boolean;
  /** Tooltip shown when hovering the button (GtkWidget:tooltip-text). */
  tooltipText?: string;
  /** Callback when the button is clicked. */
  onClicked?: () => void;
  /** Custom child widget. Overrides label/iconName if provided. */
  children?: ReactNode;
}

/**
 * GtkButton — A widget that emits a signal when clicked.
 *
 * CSS node:
 *   button[.flat][.text-button][.image-button][.image-text-button]
 *     └── <child>
 *
 * @see https://docs.gtk.org/gtk4/class.Button.html
 */
export const GtkButton = forwardRef<HTMLButtonElement, GtkButtonProps>(function GtkButton(
  {
    label,
    iconName,
    hasFrame = true,
    canShrink = false,
    useUnderline = false,
    disabled = false,
    tooltipText,
    onClicked,
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

  const [keyboardActivating, setKeyboardActivating] = useState(false);
  const activateTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // gtk_button_finish_activate(): the release of a key, or the timeout,
  // clicks the button.
  const finishActivate = useCallback(() => {
    clearTimeout(activateTimeout.current);
    activateTimeout.current = undefined;
    setKeyboardActivating(false);
    buttonRef.current?.click();
  }, []);

  // gtk_real_button_activate(): Space, Enter and mnemonics show the button
  // pressed (.keyboard-activating) until it's clicked.
  const activate = useCallback(() => {
    if (activateTimeout.current !== undefined) return;
    activateTimeout.current = setTimeout(finishActivate, ACTIVATE_TIMEOUT);
    setKeyboardActivating(true);
  }, [finishActivate]);
  useWidgetActivate(buttonRef, activate);

  // gtk_button_unrealize() drops an activation in progress.
  useEffect(() => () => clearTimeout(activateTimeout.current), []);

  const hasCustomChild = children != null;
  const hasLabel = !hasCustomChild && label != null;
  const hasIcon = !hasCustomChild && iconName != null;

  // A label or image child makes it a text or image button too, like
  // gtk_button_set_child().
  const childType = isValidElement(children) ? children.type : null;
  const textButton = hasCustomChild ? childType === GtkLabel : hasLabel && !hasIcon;
  const imageButton = hasCustomChild ? childType === GtkImage : hasIcon && !hasLabel;

  const classes = ["gtk-button"];
  if (!hasFrame) classes.push("flat");
  if (textButton) classes.push("text-button");
  if (imageButton) classes.push("image-button");
  if (hasIcon && hasLabel) classes.push("image-text-button");
  if (keyboardActivating) classes.push("keyboard-activating");
  if (className) classes.push(className);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    // The button takes every key while it's activating
    // (key_controller_key_pressed_cb()), Enter's repeats too.
    if (activateTimeout.current !== undefined) {
      e.preventDefault();
    } else if (isActivateKey(e)) {
      // Not the browser's click, on Enter's press or Space's release.
      e.preventDefault();
      if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) activate();
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyUp?.(e);
    if (e.key === " ") e.preventDefault();
    // key_controller_key_released_cb()
    if (activateTimeout.current !== undefined) finishActivate();
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClicked?.();
    onClick?.(e);
  };

  // gtk_button_set_label(): a label that ellipsizes when the button can shrink.
  const labelChild = label != null && (
    <GtkLabel label={label} useUnderline={useUnderline} ellipsize={canShrink ? "end" : "none"} />
  );

  return (
    <button
      ref={buttonRef}
      type="button"
      className={classes.join(" ")}
      title={tooltipText}
      disabled={disabled}
      data-disabled={disabled || undefined}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      {...rest}
    >
      {hasCustomChild ? (
        children
      ) : hasIcon && hasLabel ? (
        // The theme spaces an icon and a label in a box (.image-text-button >
        // box), centered like AdwButtonContent's.
        <GtkBox halign="center">
          <GtkImage iconName={iconName} valign="center" />
          {labelChild}
        </GtkBox>
      ) : hasIcon ? (
        // gtk_button_set_icon_name() centers its image vertically.
        <GtkImage iconName={iconName} valign="center" />
      ) : (
        labelChild
      )}
    </button>
  );
});
