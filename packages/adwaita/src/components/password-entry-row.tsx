import { useIcon } from "@gtk-js/gtk4";
import { forwardRef, useState } from "react";
import { AdwEntryRow, type AdwEntryRowProps } from "./entry-row.tsx";

export interface AdwPasswordEntryRowProps
  extends Omit<AdwEntryRowProps, "inputPurpose" | "visibility" | "editableSuffix"> {}

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
        editableSuffix={
          capsLock && !visible && CapsLockIcon ? (
            <span className="gtk-image caps-lock-indicator">
              <CapsLockIcon size={16} />
            </span>
          ) : undefined
        }
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
      />
    );
  },
);
