import { useIcon, useListBoxRow } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes } from "react";

export interface AdwButtonRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  startIconName?: string;
  endIconName?: string;
  onActivated?: () => void;
}

/**
 * AdwButtonRow — A clickable list row (like a button in list form).
 *
 * CSS node: row.button
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ButtonRow.html
 */
export const AdwButtonRow = forwardRef<HTMLDivElement, AdwButtonRowProps>(function AdwButtonRow(
  { title, startIconName, endIconName, onActivated, className, onClick, ...rest },
  ref,
) {
  const StartIcon = useIcon(startIconName ?? "");
  const EndIcon = useIcon(endIconName ?? "");

  const placeRow = useListBoxRow();
  const classes = ["gtk-row", "button", "activatable"];
  if (className) classes.push(className);

  return placeRow(
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      className={classes.join(" ")}
      onClick={(e) => {
        onActivated?.();
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivated?.();
        }
      }}
      {...rest}
    >
      <div
        className="gtk-box gtk-box-layout horizontal"
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        {StartIcon && (
          <span className="gtk-image icon start">
            <StartIcon size={16} />
          </span>
        )}
        <span className="gtk-label title heading">{title}</span>
        {EndIcon && (
          <span className="gtk-image icon end">
            <EndIcon size={16} />
          </span>
        )}
      </div>
    </div>,
  );
});
