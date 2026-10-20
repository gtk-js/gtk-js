import type { GtkArrowType, GtkMenuModel } from "@gtk-js/gtk4";
import { GtkButton, GtkImage, GtkLabel, GtkMenuButton } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { stripMnemonic } from "../mnemonic.ts";
import { AdwButtonContent } from "./button-content.tsx";

export interface AdwSplitButtonProps extends Omit<HTMLAttributes<HTMLDivElement>, "popover"> {
  /** Text label for the action button. Ignored when `iconName` or `child` is set. */
  label?: string;
  /** Whether an underscore in the label marks a mnemonic. Default: false. */
  useUnderline?: boolean;
  /** Icon name for the action button. Ignored when `child` is set. */
  iconName?: string;
  /** Custom child widget (replaces label/icon). */
  child?: ReactNode;
  /** Popover content shown by the dropdown button. */
  popover?: ReactNode;
  /** Menu model shown by the dropdown button, in a GtkPopoverMenu. */
  menuModel?: GtkMenuModel;
  /** Arrow direction, which the dropdown opens towards. Default: "down" ("none" is the same). */
  direction?: GtkArrowType;
  /** Tooltip for the dropdown button. Default: "More Options". */
  dropdownTooltip?: string;
  /** Whether the label can shrink (ellipsize). Default: false. */
  canShrink?: boolean;
  /** Whether the split button is insensitive. */
  disabled?: boolean;
  /** Callback when the action button is clicked. */
  onClicked?: () => void;
}

/**
 * AdwSplitButton — An action button with a linked dropdown.
 *
 * CSS node:
 *   splitbutton[.image-button][.text-button][.image-text-button]
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
      useUnderline = false,
      iconName,
      child,
      popover,
      menuModel,
      direction = "down",
      dropdownTooltip = "More Options",
      canShrink = false,
      disabled = false,
      onClicked,
      className,
      ...rest
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

    const [open, setOpen] = useState(false);
    // An insensitive menu button closes its popover.
    if (disabled && open) setOpen(false);

    // Like update_state(): the split button is :active while one of its
    // buttons is keyboard-activating (a pointer press makes it :active anyway).
    const [keyboardActivating, setKeyboardActivating] = useState(false);
    useEffect(() => {
      const buttons = rootRef.current?.querySelectorAll(
        ":scope > .gtk-button, :scope > .gtk-menubutton > .gtk-button",
      );
      if (!buttons) return;
      const observer = new MutationObserver(() =>
        setKeyboardActivating(
          [...buttons].some((button) => button.classList.contains("keyboard-activating")),
        ),
      );
      for (const button of buttons) observer.observe(button, { attributeFilter: ["class"] });
      return () => observer.disconnect();
    }, []);

    // The button holds one child: setting the label, icon name or child
    // replaces the others (adw_split_button_set_label() etc.).
    const hasIcon = child == null && iconName != null;
    const hasLabel = child == null && !hasIcon && label != null;

    const rootClasses = ["gtk-splitbutton", "gtk-box-layout", "horizontal"];
    if (hasLabel) rootClasses.push("text-button");
    if (hasIcon) rootClasses.push("image-button");
    // AdwButtonContent styles the split button rather than its button
    // (adw_button_content_root()).
    if (isValidElement(child) && child.type === AdwButtonContent) {
      rootClasses.push("image-text-button");
    }
    if (className) rootClasses.push(className);

    // The button is labelled and described by the group, when it has a label.
    const id = useId();
    const rootId = rest.id ?? id;
    const labelled = rest["aria-label"] != null || rest["aria-labelledby"] != null;

    return (
      <div
        ref={rootRef}
        id={labelled ? rootId : undefined}
        role="group"
        className={rootClasses.join(" ")}
        data-hexpand="false"
        data-checked={open || undefined}
        data-active={keyboardActivating || undefined}
        data-disabled={disabled || undefined}
        aria-disabled={disabled || undefined}
        {...rest}
      >
        <GtkButton
          splitButton
          type="button"
          hexpand
          disabled={disabled}
          aria-labelledby={labelled ? rootId : undefined}
          aria-describedby={labelled ? rootId : undefined}
          // An ellipsizing label lets the button shrink (gtk_button_set_can_shrink()).
          style={canShrink ? { minWidth: 0 } : undefined}
          onClicked={onClicked}
        >
          {child ??
            (hasIcon ? (
              <GtkImage iconName={iconName} valign="center" />
            ) : hasLabel ? (
              <GtkLabel
                label={useUnderline ? stripMnemonic(label) : label}
                ellipsize={canShrink ? "end" : "none"}
              />
            ) : null)}
        </GtkButton>
        <div className="gtk-separator vertical" />
        <GtkMenuButton
          splitButton
          direction={direction}
          popover={popover}
          menuModel={menuModel}
          tooltipText={dropdownTooltip}
          disabled={disabled}
          active={open}
          onActiveChanged={setOpen}
        />
      </div>
    );
  },
);
