import { GtkImage, labelText, useListBoxRow } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes } from "react";
import { inListBox, isActivationKey } from "../row-activation.ts";

export interface AdwButtonRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Row title text. */
  title: string;
  /**
   * Whether the title is Pango markup (`<b>`, `&amp;`, …): a literal `&` or `<`
   * then has to be escaped, or the label shows nothing. Default: true.
   */
  useMarkup?: boolean;
  /** Whether an underscore in the title marks a mnemonic, and isn't shown. Default: false. */
  useUnderline?: boolean;
  /** Icon before the title. */
  startIconName?: string;
  /** Icon after the title. */
  endIconName?: string;
  /** Callback when row is activated. */
  onActivated?: () => void;
  /** Whether the row is insensitive: it takes no input or focus, and is dimmed. Default: false. */
  disabled?: boolean;
}

/** An ellipsizing label's text, which shrinks with the label (GtkLabel's ellipsize=end). */
const ELLIPSIS_STYLE: React.CSSProperties = {
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "pre",
};

/**
 * AdwButtonRow — A list row that looks like a button, for actions at the end of a boxed list.
 *
 * CSS node:
 *   row.button
 *     └── box
 *         ├── image.icon.start
 *         ├── label.title
 *         └── image.icon.end
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ButtonRow.html
 */
export const AdwButtonRow = forwardRef<HTMLDivElement, AdwButtonRowProps>(function AdwButtonRow(
  {
    title,
    useMarkup = true,
    useUnderline = false,
    startIconName,
    endIconName,
    onActivated,
    disabled = false,
    className,
    onClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const placeRow = useListBoxRow();
  // GTK doesn't pick an insensitive row, so it never shows its hover or press.
  const classes = ["gtk-row", "button"];
  if (!disabled) classes.push("activatable");
  if (className) classes.push(className);

  const insensitive = {
    "aria-disabled": disabled || undefined,
    "data-disabled": disabled || undefined,
  };

  return placeRow(
    <div
      ref={ref}
      role="button"
      tabIndex={disabled ? undefined : 0}
      className={classes.join(" ")}
      {...insensitive}
      onClick={(e) => {
        if (disabled) return;
        onActivated?.();
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (!disabled && isActivationKey(e)) {
          // In a GtkListBox, the list also takes the key, to emit row-activated
          // (gtk_list_box_activate()).
          if (!inListBox(e.currentTarget)) e.preventDefault();
          onActivated?.();
        }
        onKeyDown?.(e);
      }}
      {...rest}
    >
      {/* The box is centered, no wider than the row: see layout.css. */}
      <div className="gtk-box gtk-box-layout horizontal" {...insensitive}>
        {startIconName && (
          <GtkImage
            iconName={startIconName}
            className="icon start"
            valign="center"
            {...insensitive}
          />
        )}
        {title && (
          <span
            className="gtk-label title"
            style={{ justifyContent: "center", textAlign: "center", overflow: "hidden" }}
            {...insensitive}
          >
            <span style={ELLIPSIS_STYLE}>{labelText(title, useMarkup, useUnderline)}</span>
          </span>
        )}
        {endIconName && (
          <GtkImage iconName={endIconName} className="icon end" valign="center" {...insensitive} />
        )}
      </div>
    </div>,
  );
});
