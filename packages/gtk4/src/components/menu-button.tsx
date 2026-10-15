import {
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useIcon } from "../icon-context.tsx";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkArrowType,
  type GtkPositionType,
} from "../types.ts";
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
  // popover.menu, which the theme's menu rules need, for a menu model or a
  // GtkPopoverMenu passed as the popover.
  const isMenu = menuModel != null || (isValidElement(popover) && popover.type === GtkPopoverMenu);

  return (
    <div
      ref={rootRef}
      className={rootClasses.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      <button
        ref={buttonRef}
        type="button"
        title={tooltipText}
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
