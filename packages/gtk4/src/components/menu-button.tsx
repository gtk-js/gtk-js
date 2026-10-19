import {
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useIcon } from "../icon-context.tsx";
import { tooltipAttrs } from "../tooltip.tsx";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkArrowType,
  type GtkPositionType,
} from "../types.ts";
import { GtkBox } from "./box.tsx";
import { GtkImage } from "./image.tsx";
import { GtkLabel } from "./label.tsx";
import { GtkPopover } from "./popover.tsx";
import {
  type GtkMenuModel,
  GtkPopoverMenu,
  PopoverMenuCloseProvider,
  PopoverMenuKeyboardProvider,
} from "./popover-menu.tsx";

export interface GtkMenuButtonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "popover">,
    GtkAlignProps {
  /** Popover content to show when clicked. */
  popover?: ReactNode;
  /** Menu model; renders a GtkPopoverMenu (popover.menu) when set. */
  menuModel?: GtkMenuModel;
  /** Whether the popover is open (controlled). */
  active?: boolean;
  /** Called when the popover opens or closes. */
  onActiveChanged?: (active: boolean) => void;
  /** Tooltip for the button. */
  tooltipText?: string;
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
  /**
   * @internal The menu button of an AdwSplitButton: its button has no
   * .image-button (update_style_classes() in adw-split-button.c), and the
   * theme draws its arrow.none as pan-down.
   */
  splitButton?: boolean;
}

/** How long a keyboard activation shows the button pressed at most (gtkbutton.c). */
const ACTIVATE_TIMEOUT = 250;

/** The shown primary menu buttons, which F10 opens. */
interface PrimaryMenuButton {
  element: RefObject<HTMLElement | null>;
  popup: () => void;
}

const primaryMenuButtons = new Set<PrimaryMenuButton>();

/**
 * gtk_window_activate_menubar(): F10 pops up the first primary menu button in
 * focus order that is shown.
 */
function handlePrimaryKeyDown(e: globalThis.KeyboardEvent) {
  if (e.key !== "F10" || e.defaultPrevented || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)
    return;
  let first: PrimaryMenuButton | undefined;
  for (const button of primaryMenuButtons) {
    const element = button.element.current;
    if (!element?.checkVisibility()) continue;
    const firstElement = first?.element.current;
    if (
      !firstElement ||
      element.compareDocumentPosition(firstElement) & Node.DOCUMENT_POSITION_FOLLOWING
    )
      first = button;
  }
  if (!first) return;
  e.preventDefault();
  first.popup();
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
 *   menubutton.popup
 *     └── button.toggle
 *         ├── box.horizontal
 *         │   ├── [label|image|contents]
 *         │   └── [arrow]
 *         ╰── (or only) arrow
 *
 * @see https://docs.gtk.org/gtk4/class.MenuButton.html
 */
export const GtkMenuButton = forwardRef<HTMLDivElement, GtkMenuButtonProps>(function GtkMenuButton(
  {
    popover,
    menuModel,
    active,
    onActiveChanged,
    tooltipText,
    iconName,
    label,
    direction = "down",
    hasFrame = true,
    children,
    alwaysShowArrow = false,
    canShrink = false,
    primary = false,
    disabled,
    splitButton = false,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = active ?? internalOpen;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

  const setOpen = useCallback(
    (next: boolean) => {
      if (active === undefined) setInternalOpen(next);
      onActiveChanged?.(next);
    },
    [active, onActiveChanged],
  );
  const popoverRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    // A popover closing with the keyboard focus gives it back to the button,
    // as in GTK.
    if (popoverRef.current?.contains(document.activeElement))
      buttonRef.current?.focus({ preventScroll: true });
    setOpen(false);
  }, [setOpen]);

  // gtk_menu_button_state_flags_changed(): an insensitive menu button hides
  // its popover, which untoggles the button.
  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open, setOpen]);

  const ArrowIcon = useIcon(
    splitButton && direction === "none" ? "PanDown" : (arrowIconMap[direction] ?? "PanDown"),
  );

  const hasCustomChild = children != null;
  const hasLabel = label != null && !hasCustomChild;
  const hasIcon = iconName != null && !hasCustomChild;
  const arrowOnly = !hasCustomChild && !hasLabel && !hasIcon;
  // update_arrow(): next to a label (or anything, with alwaysShowArrow) only
  // when it points somewhere.
  const showArrow = arrowOnly || ((hasLabel || alwaysShowArrow) && direction !== "none");

  // gtk_menu_button_init() adds .popup.
  const rootClasses = ["gtk-menubutton", "popup"];
  if (className) rootClasses.push(className);

  const [keyboardActivating, setKeyboardActivating] = useState(false);
  const activateTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const btnClasses = ["gtk-button", "toggle"];
  if (!hasFrame) btnClasses.push("flat");
  if ((arrowOnly || hasIcon) && !splitButton) btnClasses.push("image-button");
  if (hasLabel) btnClasses.push("text-button");
  if (showArrow && !arrowOnly) btnClasses.push("arrow-button");
  if (keyboardActivating) btnClasses.push("keyboard-activating");

  const [openedFromKeyboard, setOpenedFromKeyboard] = useState(false);
  const toggle = useCallback(
    (e: MouseEvent) => {
      if (disabled) return;
      // Enter and Space click without a pointer (detail 0).
      setOpenedFromKeyboard(e.detail === 0);
      setOpen(!open);
    },
    [disabled, open, setOpen],
  );

  // gtk_button_finish_activate(): the release of a key, or the timeout,
  // clicks the button.
  const finishActivate = useCallback(() => {
    clearTimeout(activateTimeout.current);
    activateTimeout.current = undefined;
    setKeyboardActivating(false);
    buttonRef.current?.click();
  }, []);
  // gtk_button_unrealize() drops an activation in progress.
  useEffect(() => () => clearTimeout(activateTimeout.current), []);

  // gtk_real_button_activate(): Space and Enter show the button pressed
  // (.keyboard-activating) until it's clicked.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    // The button takes every key while it's activating
    // (key_controller_key_pressed_cb()), Enter's repeats too.
    if (activateTimeout.current !== undefined) {
      e.preventDefault();
    } else if (e.key === " " || e.key === "Enter") {
      // Not the browser's click, on Enter's press or Space's release.
      e.preventDefault();
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      activateTimeout.current = setTimeout(finishActivate, ACTIVATE_TIMEOUT);
      setKeyboardActivating(true);
    }
  };
  const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " ") e.preventDefault();
    // key_controller_key_released_cb()
    if (activateTimeout.current !== undefined) finishActivate();
  };

  // Popovers open away from the arrow direction, like GTK.
  const position: GtkPositionType =
    direction === "up"
      ? "top"
      : direction === "left"
        ? "left"
        : direction === "right"
          ? "right"
          : "bottom";
  const hasPopover = popover != null || menuModel != null;

  // A primary menu button opens on F10, from the keyboard
  // (gtk_menu_button_set_primary()).
  const popupRef = useRef(() => {});
  popupRef.current = () => {
    if (open) return;
    setOpenedFromKeyboard(true);
    setOpen(true);
  };
  const isPrimary = primary && !disabled && hasPopover;
  useEffect(() => {
    if (!isPrimary) return;
    const entry: PrimaryMenuButton = { element: rootRef, popup: () => popupRef.current() };
    if (primaryMenuButtons.size === 0) document.addEventListener("keydown", handlePrimaryKeyDown);
    primaryMenuButtons.add(entry);
    return () => {
      primaryMenuButtons.delete(entry);
      if (primaryMenuButtons.size === 0)
        document.removeEventListener("keydown", handlePrimaryKeyDown);
    };
  }, [isPrimary]);

  const arrow = showArrow && ArrowIcon && (
    // add_arrow() centers the arrow when it's the button's only child.
    <span className={`gtk-arrow ${direction}`} data-halign={arrowOnly ? "center" : undefined}>
      <ArrowIcon size={16} />
    </span>
  );
  // popover.menu, which the theme's menu rules need, for a menu model or a
  // GtkPopoverMenu passed as the popover.
  const isMenu = menuModel != null || (isValidElement(popover) && popover.type === GtkPopoverMenu);

  return (
    <div
      ref={rootRef}
      className={rootClasses.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-disabled={disabled || undefined}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      <button
        ref={buttonRef}
        type="button"
        {...tooltipAttrs(tooltipText)}
        className={btnClasses.join(" ")}
        aria-haspopup="true"
        aria-expanded={open}
        data-checked={open || undefined}
        // Without a popover there's nothing to open (update_sensitivity()).
        disabled={disabled || !hasPopover}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      >
        {arrowOnly ? (
          arrow
        ) : hasCustomChild ? (
          // gtk_menu_button_set_child(): the child in an expanding bin, then
          // the arrow.
          <GtkBox hexpand={false}>
            <div className="gtk-contents gtk-bin-layout" data-hexpand="true">
              {children}
            </div>
            {arrow}
          </GtkBox>
        ) : hasIcon ? (
          // gtk_menu_button_set_icon_name()
          <GtkBox halign="center">
            <GtkImage iconName={iconName} />
            {arrow}
          </GtkBox>
        ) : (
          // gtk_menu_button_set_label(): the label ellipsizes when the button
          // can shrink.
          <GtkBox hexpand={false}>
            <GtkLabel label={label ?? ""} hexpand ellipsize={canShrink ? "end" : "none"} />
            {arrow}
          </GtkBox>
        )}
      </button>
      {hasPopover && (
        <GtkPopover
          ref={popoverRef}
          visible={open}
          position={position}
          anchorRef={rootRef}
          pointingTo={buttonRef}
          onClosed={close}
          className={isMenu ? "menu" : undefined}
        >
          <PopoverMenuCloseProvider value={close}>
            <PopoverMenuKeyboardProvider value={openedFromKeyboard}>
              {menuModel ? <GtkPopoverMenu model={menuModel}>{popover}</GtkPopoverMenu> : popover}
            </PopoverMenuKeyboardProvider>
          </PopoverMenuCloseProvider>
        </GtkPopover>
      )}
    </div>
  );
});
