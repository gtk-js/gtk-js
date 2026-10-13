import { createContext, forwardRef, type HTMLAttributes, type ReactNode, useContext } from "react";

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
  className,
  style,
  ...rest
}: GtkModelButtonProps) {
  const close = usePopoverClose();
  const classes = ["gtk-modelbutton", "flat", "gtk-box-layout", "horizontal"];
  if (className) classes.push(className);
  return (
    <button
      type="button"
      role="menuitem"
      {...rest}
      className={classes.join(" ")}
      disabled={disabled}
      style={{ alignItems: "center", ...style }}
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
  function GtkPopoverMenu({ model = [], children, className, ...rest }, ref) {
    const classes = ["gtk-stack"];
    if (className) classes.push(className);
    const sections = model.filter((section) => section.length > 0);
    return (
      <div ref={ref} role="menu" className={classes.join(" ")} {...rest}>
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

function SectionFragment({ separator, children }: { separator: boolean; children: ReactNode }) {
  return (
    <>
      {separator && <div className="gtk-separator horizontal" role="separator" />}
      {children}
    </>
  );
}
