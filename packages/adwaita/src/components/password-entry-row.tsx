import { useIcon } from "@gtk-js/gtk4";
import { forwardRef, useState } from "react";
import { AdwEntryRow, type AdwEntryRowProps } from "./entry-row.tsx";

export interface AdwPasswordEntryRowProps
  extends Omit<
    AdwEntryRowProps,
    "inputPurpose" | "visibility" | "indicator" | "indicatorTooltip"
  > {}

/**
 * AdwPasswordEntryRow — An AdwEntryRow tailored for entering secrets.
 *
 * Like upstream it is an AdwEntryRow subclass: same title animation and
 * activation behavior, with hidden text, a peek button and a caps lock
 * indicator.
 *
 * CSS node: row.entry.password
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.PasswordEntryRow.html
 * @see upstream/libadwaita/src/adw-password-entry-row.c
 */
export const AdwPasswordEntryRow = forwardRef<HTMLDivElement, AdwPasswordEntryRowProps>(
  function AdwPasswordEntryRow({ suffixWidget, className, onEntryKeyDown, ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const RevealIcon = useIcon("ViewReveal");
    const ConcealIcon = useIcon("ViewConceal");
    const CapsLockIcon = useIcon("CapsLock");
    const PeekIcon = visible ? ConcealIcon : RevealIcon;

    const classes = ["password"];
    if (className) classes.push(className);

    return (
      <AdwEntryRow
        ref={ref}
        className={classes.join(" ")}
        inputPurpose="password"
        visibility={visible}
        onEntryKeyDown={(e) => {
          setCapsLock(e.getModifierState("CapsLock"));
          onEntryKeyDown?.(e);
        }}
        // adw_entry_row_set_indicator_*(): the row shows it while editing.
        indicator={capsLock && !visible && CapsLockIcon ? <CapsLockIcon size={16} /> : undefined}
        indicatorTooltip="Caps Lock is on"
        suffixWidget={
          <>
            {PeekIcon && (
              <button
                type="button"
                className="gtk-button flat"
                title={visible ? "Hide Text" : "Show Text"}
                onClick={(e) => {
                  e.stopPropagation();
                  setVisible(!visible);
                }}
              >
                <span className="gtk-image">
                  <PeekIcon size={16} />
                </span>
              </button>
            )}
            {suffixWidget}
          </>
        }
        {...rest}
        // gdk_device_get_caps_lock_state(): browsers tell it with each key and
        // press, so read it when the row is focused with either too.
        onKeyUp={(e) => {
          setCapsLock(e.getModifierState("CapsLock"));
          rest.onKeyUp?.(e);
        }}
        onMouseDown={(e) => {
          setCapsLock(e.getModifierState("CapsLock"));
          rest.onMouseDown?.(e);
        }}
      />
    );
  },
);
