import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/** One entry of a menu model (like a GMenuItem with an action). */
export interface GtkMenuItem {
  label: string;
  /** Called after the menu closes. */
  onActivate?: () => void;
  /** Keyboard shortcut shown on the right (e.g. "Ctrl+Q"). */
  accel?: string;
  disabled?: boolean;
}

/** A menu model: sections of items, separated by separators. */
export type GtkMenuModel = GtkMenuItem[][];

const PopoverMenuCloseContext = createContext<() => void>(() => {});

/** Provided by GtkMenuButton so menu content can close its popover. */
export const PopoverMenuCloseProvider = PopoverMenuCloseContext.Provider;

const OpenedFromKeyboardContext = createContext(false);

/** Provided by GtkMenuButton: whether its popover was opened from the keyboard. */
export const PopoverMenuKeyboardProvider = OpenedFromKeyboardContext.Provider;

/** Close the enclosing menu button's popover. */
export function usePopoverClose(): () => void {
  return useContext(PopoverMenuCloseContext);
}

export interface GtkModelButtonProps extends HTMLAttributes<HTMLButtonElement> {
  label: string;
  accel?: string;
  disabled?: boolean;
  onActivate?: () => void;
}

/**
 * GtkModelButton — A menu item inside a GtkPopoverMenu.
 *
 * CSS node:
 *   modelbutton.flat
 *     ├── label
 *     └── accelerator
 */
export function GtkModelButton({
  label,
  accel,
  disabled,
  onActivate,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  className,
  style,
  ...rest
}: GtkModelButtonProps) {
  const close = usePopoverClose();
  // The menu's active item, drawn :selected: the one the pointer entered or
  // the keyboard focus reached, until the pointer leaves it
  // (gtk_popover_menu_set_active_item()).
  const [active, setActive] = useState(false);
  const classes = ["gtk-modelbutton", "flat", "gtk-box-layout", "horizontal"];
  if (className) classes.push(className);
  return (
    <button
      type="button"
      role="menuitem"
      // The menu moves the focus between its items (GtkPopoverMenu).
      tabIndex={-1}
      {...rest}
      className={classes.join(" ")}
      disabled={disabled}
      data-selected={active || undefined}
      style={{ alignItems: "center", ...style }}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        if (!disabled) e.currentTarget.focus({ preventScroll: true });
      }}
      onMouseLeave={(e) => {
        onMouseLeave?.(e);
        setActive(false);
      }}
      onFocus={(e) => {
        onFocus?.(e);
        setActive(true);
      }}
      onBlur={(e) => {
        onBlur?.(e);
        setActive(false);
      }}
      onClick={(e) => {
        // A caller's onClick runs too; activating still closes the menu and
        // runs onActivate, as in GTK.
        onClick?.(e);
        close();
        onActivate?.();
      }}
    >
      <span className="gtk-label" style={{ flex: 1, textAlign: "start", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {accel && <span className="gtk-accelerator">{accel}</span>}
    </button>
  );
}

export interface GtkPopoverMenuProps extends HTMLAttributes<HTMLDivElement> {
  /** Menu model to render. */
  model?: GtkMenuModel;
  /** Extra content appended after the model (custom widgets). */
  children?: ReactNode;
}

/**
 * GtkPopoverMenu contents — renders a menu model inside a popover.menu.
 *
 * Use as the `popover` of a GtkMenuButton (or pass `menuModel` directly).
 *
 * CSS node (inside popover.menu > contents):
 *   stack
 *     └── box.vertical
 *         ├── modelbutton…
 *         ├── separator
 *         └── modelbutton…
 *
 * @see https://docs.gtk.org/gtk4/class.PopoverMenu.html
 */
export const GtkPopoverMenu = forwardRef<HTMLDivElement, GtkPopoverMenuProps>(
  function GtkPopoverMenu({ model = [], children, className, onKeyDown, ...rest }, ref) {
    const menuRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => menuRef.current as HTMLDivElement);
    const fromKeyboard = useContext(OpenedFromKeyboardContext);

    // A modal popover takes the keyboard focus. Opened from the keyboard, the
    // menu starts on its first item, where Down would take it in GTK.
    useEffect(() => {
      const menu = menuRef.current;
      if (!menu) return;
      const first = fromKeyboard ? menuItems(menu)[0] : undefined;
      (first ?? menu).focus({ preventScroll: true });
    }, [fromKeyboard]);

    const classes = ["gtk-stack"];
    if (className) classes.push(className);
    const sections = model.filter((section) => section.length > 0);
    return (
      <div
        ref={menuRef}
        role="menu"
        tabIndex={-1}
        className={classes.join(" ")}
        {...rest}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          const menu = menuRef.current;
          if (e.defaultPrevented || !menu) return;
          // Up/Down and (Shift+)Tab cycle through the items, as in a modal
          // GtkPopoverMenu; Home and End go to the first and last.
          const items = menuItems(menu);
          const current = items.indexOf(document.activeElement as HTMLElement);
          if (items.length === 0 || (current < 0 && document.activeElement !== menu)) return;
          const forward = e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey);
          const backward = e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey);
          let next: number;
          if (forward) next = current < 0 ? 0 : (current + 1) % items.length;
          else if (backward)
            next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = items.length - 1;
          else return;
          e.preventDefault();
          items[next]?.focus({ preventScroll: true });
        }}
      >
        <div className="gtk-box gtk-box-layout vertical">
          {sections.map((section, i) => (
            <SectionFragment key={i} separator={i > 0}>
              {section.map((item, j) => (
                <GtkModelButton
                  // Positional: a section may repeat a label.
                  key={j}
                  label={item.label}
                  accel={item.accel}
                  disabled={item.disabled}
                  onActivate={item.onActivate}
                />
              ))}
            </SectionFragment>
          ))}
          {children}
        </div>
      </div>
    );
  },
);

/** The menu's enabled items, in order. */
function menuItems(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
}

function SectionFragment({ separator, children }: { separator: boolean; children: ReactNode }) {
  return (
    <>
      {separator && <div className="gtk-separator horizontal" role="separator" />}
      {children}
    </>
  );
}
