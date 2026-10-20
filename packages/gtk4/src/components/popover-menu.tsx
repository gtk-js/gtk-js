import {
  type CSSProperties,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GtkScrolledWindow, type GtkScrolledWindowProps } from "./scrolled-window.tsx";

/** One entry of a menu model (like a GMenuItem with an action). */
export interface GtkMenuItem {
  /** The item's text. An underscore marks its mnemonic: "_Quit" activates on Q. */
  label: string;
  /** Called after the menu closes. */
  onActivate?: () => void;
  /**
   * Keyboard shortcut, shown on the right and activating the item while the
   * menu is open: GTK syntax ("<Control>q") or as shown ("Ctrl+Q").
   */
  accel?: string;
  disabled?: boolean;
}

/** A menu model: sections of items, separated by separators. */
export type GtkMenuModel = GtkMenuItem[][];

const PopoverMenuCloseContext = createContext<() => void>(() => {});

/** Provided by GtkMenuButton so menu content can close its popover. */
export const PopoverMenuCloseProvider = PopoverMenuCloseContext.Provider;

/** Whether the menu underlines its mnemonics (GtkPopover:mnemonics-visible). */
const MnemonicsVisibleContext = createContext(false);

/** Close the enclosing menu button's popover. */
export function usePopoverClose(): () => void {
  return useContext(PopoverMenuCloseContext);
}

/** A key with modifiers, as a GtkShortcutTrigger matches it. */
export interface Accelerator {
  /** The KeyboardEvent.key it matches: a lowercase character or a key name. */
  key: string;
  /** How the key is shown. */
  keyLabel: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

type Modifier = "shift" | "ctrl" | "alt" | "meta";

const MODIFIERS: Record<string, Modifier> = {
  shift: "shift",
  control: "ctrl",
  ctrl: "ctrl",
  primary: "ctrl",
  alt: "alt",
  mod1: "alt",
  super: "meta",
  meta: "meta",
};

/** GDK key names (and their labels) with a different KeyboardEvent.key. */
const KEY_NAMES: Record<string, string> = {
  return: "Enter",
  kp_enter: "Enter",
  space: " ",
  backspace: "Backspace",
  page_up: "PageUp",
  "page up": "PageUp",
  page_down: "PageDown",
  "page down": "PageDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  plus: "+",
  minus: "-",
  equal: "=",
  comma: ",",
  period: ".",
  slash: "/",
  backslash: "\\",
};

/**
 * Parses an accelerator in GTK's syntax, "<Control><Shift>q"
 * (gtk_accelerator_parse()), or as shown, "Shift+Ctrl+Q". Null if it isn't one.
 */
export function parseAccelerator(accel: string): Accelerator | null {
  const result: Accelerator = {
    key: "",
    keyLabel: "",
    shift: false,
    ctrl: false,
    alt: false,
    meta: false,
  };
  const gtk = /^((?:<\w+>)*)(.+)$/.exec(accel.trim());
  const shown = /^((?:\w+\+)*)(.+)$/.exec(accel.trim());
  const match = accel.trim().startsWith("<") ? gtk : shown;
  if (!match?.[2]) return null;
  for (const name of match[1]?.match(/\w+/g) ?? []) {
    const modifier = MODIFIERS[name.toLowerCase()];
    if (!modifier) return null;
    result[modifier] = true;
  }
  const key = match[2];
  const named = KEY_NAMES[key.toLowerCase()];
  const char = Array.from(named ?? key).length === 1;
  result.key = named ?? (char ? key.toLowerCase() : key.replace(/_/g, ""));
  // A character shows uppercase, other keys by name (append_accelerator_label()).
  result.keyLabel =
    result.key === " "
      ? "Space"
      : result.key === "\\"
        ? "Backslash"
        : char
          ? result.key.toUpperCase()
          : key.replace(/_/g, " ");
  return result;
}

/** How GTK shows an accelerator: "Shift+Ctrl+Q" (gtk_accelerator_get_label()). */
export function acceleratorLabel({ keyLabel, shift, ctrl, alt, meta }: Accelerator): string {
  const parts: string[] = [];
  if (shift) parts.push("Shift");
  if (ctrl) parts.push("Ctrl");
  if (alt) parts.push("Alt");
  if (meta) parts.push("Super");
  parts.push(keyLabel);
  return parts.join("+");
}

/** Whether a key press triggers the accelerator. */
export function matchesAccelerator(
  accel: Accelerator,
  e: KeyboardEvent | globalThis.KeyboardEvent,
) {
  if (e.ctrlKey !== accel.ctrl || e.altKey !== accel.alt || e.metaKey !== accel.meta) return false;
  const char = Array.from(accel.key).length === 1;
  const letter = /^[a-z]$/.test(accel.key);
  // Shift picks the character of a symbol key, so it doesn't have to match.
  if (e.shiftKey !== accel.shift && (!char || letter)) return false;
  if (!char) return e.key === accel.key;
  if (e.key.toLowerCase() === accel.key) return true;
  // Modifiers can change the character: fall back to the key's own.
  return /^(?:Key|Digit)(.)$/.exec(e.code)?.[1]?.toLowerCase() === accel.key;
}

/**
 * Splits a label at its mnemonic: "_Quit" is "", "Q", "uit"
 * (gtk_label_set_text_with_mnemonic()). `__` is a literal underscore.
 */
export function parseMnemonic(label: string): {
  before: string;
  mnemonic: string | null;
  after: string;
} {
  const chars = Array.from(label);
  let before = "";
  for (let i = 0; i < chars.length; i++) {
    const next = chars[i + 1];
    if (chars[i] !== "_" || next === undefined) before += chars[i];
    else if (next === "_") {
      before += "_";
      i++;
    } else {
      const after = chars
        .slice(i + 2)
        .join("")
        .replace(/__/g, "_");
      return { before, mnemonic: next, after };
    }
  }
  return { before, mnemonic: null, after: "" };
}

/** What activates a menu item from the keyboard: its accelerator and mnemonic key. */
const itemKeys = new WeakMap<Element, { accel: Accelerator | null; mnemonic: string | null }>();

/** PANGO_UNDERLINE_LOW, drawn through descenders. */
const UNDERLINE: CSSProperties = { textDecorationLine: "underline", textDecorationSkipInk: "none" };

export interface GtkModelButtonProps extends HTMLAttributes<HTMLButtonElement> {
  label: string;
  accel?: string;
  disabled?: boolean;
  onActivate?: () => void;
}

/**
 * GtkModelButton — A menu item inside a GtkPopoverMenu.
 *
 * Its label's mnemonic and its accelerator activate it while the menu is open
 * (gtk_model_button_set_text(), update_accel()).
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
  const mnemonicsVisible = useContext(MnemonicsVisibleContext);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // The menu's active item, drawn :selected: the one the pointer entered or
  // the keyboard focus reached, until the pointer leaves it
  // (gtk_popover_menu_set_active_item()).
  const [active, setActive] = useState(false);
  const text = useMemo(() => parseMnemonic(label), [label]);
  const shortcut = useMemo(() => (accel ? parseAccelerator(accel) : null), [accel]);
  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    itemKeys.set(button, { accel: shortcut, mnemonic: text.mnemonic?.toLowerCase() ?? null });
    return () => {
      itemKeys.delete(button);
    };
  }, [shortcut, text.mnemonic]);
  const classes = ["gtk-modelbutton", "flat", "gtk-box-layout", "horizontal"];
  if (className) classes.push(className);
  // GTK makes the children of an insensitive widget insensitive too, so the
  // theme dims the label (label:disabled).
  const insensitive = disabled || undefined;
  return (
    <button
      ref={buttonRef}
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
      <span
        className="gtk-label"
        data-disabled={insensitive}
        style={{ flex: 1, textAlign: "start", whiteSpace: "nowrap" }}
      >
        {text.before}
        {text.mnemonic && (
          // Underlined once the keyboard moves in the menu, if sensitive.
          <span style={mnemonicsVisible && !disabled ? UNDERLINE : undefined}>{text.mnemonic}</span>
        )}
        {text.after}
      </span>
      {accel && (
        <span className="gtk-accelerator" data-disabled={insensitive}>
          {shortcut ? acceleratorLabel(shortcut) : accel}
        </span>
      )}
    </button>
  );
}

export interface GtkPopoverMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "onScroll"> {
  /** Menu model to render. */
  model?: GtkMenuModel;
  /** Fires when the menu scrolls, from its scrolled window (GtkScrolledWindow's onScroll). */
  onScroll?: GtkScrolledWindowProps["onScroll"];
  /** Extra content appended after the model (custom widgets). */
  children?: ReactNode;
}

/**
 * GtkPopoverMenu contents — renders a menu model inside a popover.menu.
 *
 * Use as the `popover` of a GtkMenuButton (or pass `menuModel` directly).
 *
 * When shown it focuses its first item, which becomes the active one, as an
 * autohide popover focuses its first child (gtk_popover_show()). Up/Down and
 * (Shift+)Tab cycle through the items and show the mnemonics; an item's
 * mnemonic key, without Alt, or its accelerator activates it. A menu taller
 * than the window scrolls, keeping the focused item in view.
 *
 * CSS node (inside popover.menu > contents):
 *   scrolledwindow
 *     └── viewport
 *         └── stack
 *             └── box.vertical
 *                 ├── modelbutton…
 *                 ├── separator
 *                 └── modelbutton…
 *
 * @see https://docs.gtk.org/gtk4/class.PopoverMenu.html
 */
export const GtkPopoverMenu = forwardRef<HTMLDivElement, GtkPopoverMenuProps>(
  function GtkPopoverMenu({ model = [], children, className, onKeyDown, onFocus, ...rest }, ref) {
    const menuRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => menuRef.current as HTMLDivElement);
    const [mnemonicsVisible, setMnemonicsVisible] = useState(false);

    useEffect(() => {
      const menu = menuRef.current;
      if (!menu) return;
      (menuItems(menu)[0] ?? menu).focus({ preventScroll: true });
    }, []);

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      const menu = menuRef.current;
      if (e.defaultPrevented || !menu) return;
      const items = menuItems(menu);
      const current = items.indexOf(document.activeElement as HTMLElement);

      // The popover's shortcut controllers come first: the items'
      // accelerators, then their mnemonics, which in a menu need no modifier
      // (gtk_popover_menu_init()). Text entries keep their characters.
      const accelItem = items.find((item) => {
        const accel = itemKeys.get(item)?.accel;
        return accel && matchesAccelerator(accel, e);
      });
      if (accelItem) {
        e.preventDefault();
        accelItem.click();
        return;
      }
      const editing =
        e.target instanceof HTMLElement && e.target.matches("input, textarea, [contenteditable]");
      if (!e.ctrlKey && !e.altKey && !e.metaKey && !editing && Array.from(e.key).length === 1) {
        const key = e.key.toLowerCase();
        const matches = items.filter((item) => itemKeys.get(item)?.mnemonic === key);
        if (matches.length > 0) {
          e.preventDefault();
          // Items sharing a mnemonic take the focus in turn
          // (gtk_widget_real_mnemonic_activate()).
          if (matches.length === 1) matches[0]?.click();
          else {
            const after = matches.find((item) => items.indexOf(item) > current);
            (after ?? matches[0])?.focus({ preventScroll: true });
          }
          return;
        }
      }

      // Up/Down and (Ctrl+)(Shift+)Tab cycle through the items, as in a modal
      // GtkPopoverMenu (add_arrow_bindings(), add_tab_bindings()).
      if (items.length === 0 || (current < 0 && document.activeElement !== menu)) return;
      if (e.altKey || e.metaKey) return;
      const forward = e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey);
      const backward = e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey);
      let next: number;
      if (forward) next = current < 0 ? 0 : (current + 1) % items.length;
      else if (backward)
        next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
      else return;
      e.preventDefault();
      // Moving the focus shows the mnemonics (gtk_popover_menu_move_focus()).
      setMnemonicsVisible(true);
      items[next]?.focus({ preventScroll: true });
    };

    const sections = model.filter((section) => section.length > 0);
    return (
      // A scrolled window holds the menu's stack (gtk_popover_menu_init()).
      <GtkScrolledWindow
        ref={menuRef}
        role="menu"
        tabIndex={-1}
        hscrollbarPolicy="never"
        propagateNaturalWidth
        propagateNaturalHeight
        className={className}
        {...rest}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          onFocus?.(e);
          if (e.target !== menuRef.current) scrollToFocus(e.target, e.currentTarget);
        }}
      >
        <div className="gtk-stack">
          <div className="gtk-box gtk-box-layout vertical">
            <MnemonicsVisibleContext.Provider value={mnemonicsVisible}>
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
            </MnemonicsVisibleContext.Provider>
          </div>
        </div>
      </GtkScrolledWindow>
    );
  },
);

/** The menu's enabled items, in order. */
function menuItems(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
}

/**
 * Scrolls the least needed to show the focused element in the scrolling
 * elements up to `root`, as a viewport does with scroll-to-focus
 * (gtk_viewport_set_focus_child()).
 */
function scrollToFocus(focused: HTMLElement, root: HTMLElement) {
  for (let el = focused.parentElement; el && root.contains(el); el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight) continue;
    const item = focused.getBoundingClientRect();
    const view = el.getBoundingClientRect();
    if (item.top < view.top) el.scrollTop -= view.top - item.top;
    else if (item.bottom > view.bottom) el.scrollTop += item.bottom - view.bottom;
  }
}

function SectionFragment({ separator, children }: { separator: boolean; children: ReactNode }) {
  return (
    <>
      {separator && <div className="gtk-separator horizontal" role="separator" />}
      {children}
    </>
  );
}
