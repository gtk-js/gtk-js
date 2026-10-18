import { useListBoxRow } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface AdwPreferencesRowProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The title of the preference the row represents. AdwPreferencesRow doesn't
   * show it (AdwPreferencesDialog searches it); rows like AdwActionRow do.
   */
  title: string;
  /** Whether underscores in the title indicate mnemonics, where a row shows it. Default: false. */
  useUnderline?: boolean;
  /** Whether the title is Pango markup, where a row shows it. Default: true. */
  useMarkup?: boolean;
  /** Whether the title can be selected and copied, where a row shows it. Default: false. */
  titleSelectable?: boolean;
  /**
   * Whether the row can be activated, which gives it hover and press states.
   * In a GtkListBox, clicks, Enter and Space then emit `onRowActivated`
   * (GtkListBoxRow:activatable). Default: true.
   */
  activatable?: boolean;
  /** Whether the row is insensitive: it takes no clicks or focus. Default: false. */
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * AdwPreferencesRow — Base class for preference list rows.
 *
 * CSS node: row[.activatable]
 *
 * It shows only its child, not its title: its subclasses (AdwActionRow,
 * AdwSwitchRow, AdwComboRow, …) present the title.
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.PreferencesRow.html
 */
export const AdwPreferencesRow = forwardRef<HTMLDivElement, AdwPreferencesRowProps>(
  function AdwPreferencesRow(
    {
      title,
      useUnderline = false,
      useMarkup = true,
      titleSelectable = false,
      activatable = true,
      disabled = false,
      children,
      className,
      onClick,
      ...rest
    },
    ref,
  ) {
    const placeRow = useListBoxRow();
    const classes = ["gtk-row", "gtk-bin-layout"];
    // GTK doesn't pick an insensitive row, so it never shows its hover or press.
    if (activatable && !disabled) classes.push("activatable");
    if (className) classes.push(className);

    // Like any GtkListBoxRow, it's focusable (a Tab stop each, GTK_LIST_TAB_ALL)
    // unless it's insensitive, and then a click doesn't reach its list either.
    return placeRow(
      <div
        ref={ref}
        role="listitem"
        tabIndex={disabled ? undefined : 0}
        className={classes.join(" ")}
        aria-disabled={disabled || undefined}
        data-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        {...rest}
      >
        {children}
      </div>,
    );
  },
);
