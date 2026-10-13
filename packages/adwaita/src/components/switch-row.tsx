import { useListBoxRow } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, useCallback, useState } from "react";

export interface AdwSwitchRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Row title text. */
  title: string;
  /** Subtitle text. */
  subtitle?: string;
  /** Whether the switch is on. */
  active?: boolean;
  /** Callback when toggle state changes. */
  onActiveChanged?: (active: boolean) => void;
}

/**
 * AdwSwitchRow — An ActionRow with an integrated GtkSwitch.
 *
 * CSS node: row (with a switch as suffix)
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.SwitchRow.html
 */
export const AdwSwitchRow = forwardRef<HTMLDivElement, AdwSwitchRowProps>(function AdwSwitchRow(
  { title, subtitle, active: controlledActive, onActiveChanged, className, onClick, ...rest },
  ref,
) {
  const isControlled = controlledActive !== undefined;
  const [internalActive, setInternalActive] = useState(false);
  const active = isControlled ? controlledActive : internalActive;

  const toggle = useCallback(() => {
    const next = !active;
    if (!isControlled) setInternalActive(next);
    onActiveChanged?.(next);
  }, [active, isControlled, onActiveChanged]);

  useListBoxRow();
  const classes = ["gtk-row", "activatable"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      role="switch"
      aria-checked={active}
      className={classes.join(" ")}
      onClick={(e) => {
        toggle();
        onClick?.(e);
      }}
      {...rest}
    >
      <div
        className="gtk-box gtk-box-layout horizontal header"
        style={{ gap: 6, alignItems: "center" }}
      >
        <div className="gtk-box gtk-box-layout vertical title" style={{ flex: 1, gap: 3 }}>
          <span className="gtk-label title">{title}</span>
          {subtitle && <span className="gtk-label subtitle">{subtitle}</span>}
        </div>
        <div className="gtk-box suffixes">
          <div
            className="gtk-switch"
            data-checked={active || undefined}
            style={{ pointerEvents: "none" }}
          >
            <span className="gtk-image" />
            <span className="gtk-image" />
            <span className="gtk-slider" />
          </div>
        </div>
      </div>
    </div>
  );
});
