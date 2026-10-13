import { useListBoxRow } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface AdwPreferencesRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Row title text. */
  title: string;
  /** Whether underscores indicate mnemonics. Default: false. */
  useUnderline?: boolean;
  /** Whether to use Pango markup. Default: true. */
  useMarkup?: boolean;
  /** Whether the title text is selectable. Default: false. */
  titleSelectable?: boolean;
  children?: ReactNode;
}

/**
 * AdwPreferencesRow — Base class for preference list rows.
 *
 * CSS node: row
 *
 * Not typically used directly — subclassed by ActionRow, SwitchRow, etc.
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
      children,
      className,
      ...rest
    },
    ref,
  ) {
    useListBoxRow();
    const classes = ["gtk-row", "gtk-bin-layout"];
    if (className) classes.push(className);

    return (
      <div ref={ref} role="listitem" className={classes.join(" ")} {...rest}>
        {children ?? <span className="gtk-label title">{title}</span>}
      </div>
    );
  },
);
