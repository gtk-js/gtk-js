import { GtkImage, labelText, useListBoxRow, wrapStyle } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  clickClaimed,
  inListBox,
  isActivationKey,
  isInsensitive,
  mnemonicActivate,
} from "../row-activation.ts";

export interface AdwActionRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Row title text. Hidden when empty. */
  title: string;
  /** Subtitle text. */
  subtitle?: string;
  /** Maximum lines before title ellipsizes. 0 = unlimited. */
  titleLines?: number;
  /** Maximum lines before subtitle ellipsizes. 0 = unlimited. */
  subtitleLines?: number;
  /**
   * Whether the title and subtitle are Pango markup (`<b>`, `&amp;`, …): a
   * literal `&` or `<` then has to be escaped, or the label shows nothing.
   * Default: true.
   */
  useMarkup?: boolean;
  /** Whether an underscore in the title marks a mnemonic, and isn't shown. Default: false. */
  useUnderline?: boolean;
  /** Whether the title can be selected and copied. Default: false. */
  titleSelectable?: boolean;
  /** Whether the subtitle can be selected and copied, as in property rows. Default: false. */
  subtitleSelectable?: boolean;
  /**
   * An icon before the title.
   * @deprecated Like AdwActionRow:icon-name since libadwaita 1.3: add a GtkImage with `prefixWidget`.
   */
  iconName?: string;
  /** Prefix widgets (left side). */
  prefixWidget?: ReactNode;
  /** Suffix widgets (right side). */
  suffixWidget?: ReactNode;
  /** Activatable — enables hover/active states. Default: false. */
  activatable?: boolean;
  /**
   * The widget to activate when the row is, like a check button or switch in
   * it: activating the row toggles it, or focuses an entry. The row is
   * activatable while the widget is sensitive.
   */
  activatableWidget?: RefObject<HTMLElement | null>;
  /** Callback when row is activated. */
  onActivated?: () => void;
  /**
   * Whether the row is insensitive: it takes no input or focus, and its labels
   * are dimmed. Its prefix and suffix widgets need `disabled` of their own.
   * Default: false.
   */
  disabled?: boolean;
  /** Tooltip shown when hovering the row (GtkWidget:tooltip-text). */
  tooltipText?: string;
  children?: ReactNode;
}

/** A label style that ellipsizes after `lines` lines, or wraps (word-char) when 0. */
function labelStyle(lines: number, selectable: boolean): React.CSSProperties {
  return {
    ...(lines > 0 && {
      display: "-webkit-box",
      WebkitLineClamp: lines,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    }),
    ...wrapStyle("word-char"),
    // A selectable GtkLabel shows the text cursor (gtk_label_update_cursor())
    // and takes the focus, with no focus ring.
    ...(selectable && { userSelect: "text", cursor: "text", outline: "none" }),
  };
}

/**
 * AdwActionRow — A preferences list row with title, subtitle, prefix, suffix.
 *
 * CSS node:
 *   row[.activatable]
 *     └── box.header
 *         ├── box.prefixes
 *         ├── image.icon
 *         ├── box.title (vertical)
 *         │   ├── label.title
 *         │   └── label.subtitle
 *         └── box.suffixes
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ActionRow.html
 */
export const AdwActionRow = forwardRef<HTMLDivElement, AdwActionRowProps>(function AdwActionRow(
  {
    title,
    subtitle,
    titleLines = 0,
    subtitleLines = 0,
    useMarkup = true,
    useUnderline = false,
    titleSelectable = false,
    subtitleSelectable = false,
    iconName,
    prefixWidget,
    suffixWidget,
    activatable = false,
    activatableWidget,
    onActivated,
    disabled = false,
    tooltipText,
    children,
    className,
    onClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const placeRow = useListBoxRow();
  const titleId = useId();
  const subtitleId = useId();

  // The activatable widget's sensitivity is bound to the row's activatable,
  // and its accessible relations to the labels (adw_action_row_set_activatable_widget()).
  const [widgetSensitive, setWidgetSensitive] = useState(true);
  useLayoutEffect(() => {
    const widget = activatableWidget?.current;
    if (widget && isInsensitive(widget) === widgetSensitive) setWidgetSensitive(!widgetSensitive);
  });
  useLayoutEffect(() => {
    const widget = activatableWidget?.current;
    if (!widget) return;
    widget.setAttribute("aria-labelledby", titleId);
    if (subtitle) widget.setAttribute("aria-describedby", subtitleId);
    return () => {
      widget.removeAttribute("aria-labelledby");
      widget.removeAttribute("aria-describedby");
    };
  }, [activatableWidget, titleId, subtitleId, subtitle]);
  const isActivatable = activatableWidget ? widgetSensitive : activatable;

  // Activating the widget clicks it, and that click isn't the row's.
  const activating = useRef(false);
  const activate = () => {
    const widget = activatableWidget?.current;
    if (widget) {
      activating.current = true;
      mnemonicActivate(widget);
      activating.current = false;
    }
    onActivated?.();
  };

  const classes = ["gtk-row"];
  // GTK doesn't pick an insensitive row, so it never shows its hover or press.
  if (isActivatable && !disabled) classes.push("activatable");
  if (className) classes.push(className);

  const insensitive = {
    "aria-disabled": disabled || undefined,
    "data-disabled": disabled || undefined,
  };
  // Selectable labels are focusable (gtk_label_set_selectable()), unless insensitive.
  const titleCanSelect = titleSelectable && !disabled;
  const subtitleCanSelect = subtitleSelectable && !disabled;

  return placeRow(
    <div
      ref={ref}
      role="listitem"
      className={classes.join(" ")}
      title={tooltipText}
      // Every GtkListBoxRow is focusable, one Tab stop each (GTK_LIST_TAB_ALL),
      // unless it's insensitive.
      tabIndex={disabled ? undefined : 0}
      {...insensitive}
      onClick={(e) => {
        if (disabled || activating.current) return;
        // A button, check button, switch, … in the row claims its click, so
        // the list doesn't activate the row.
        if (isActivatable && !clickClaimed(e)) activate();
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (!disabled && isActivatable && isActivationKey(e)) {
          // In a GtkListBox, the list also takes the key, to emit row-activated
          // (gtk_list_box_activate()).
          if (!inListBox(e.currentTarget)) e.preventDefault();
          activate();
        }
        onKeyDown?.(e);
      }}
      {...rest}
    >
      <div className="gtk-box gtk-box-layout horizontal header" {...insensitive}>
        {prefixWidget && (
          <div className="gtk-box gtk-box-layout horizontal prefixes" {...insensitive}>
            {prefixWidget}
          </div>
        )}
        {iconName && (
          <GtkImage iconName={iconName} className="icon" valign="center" {...insensitive} />
        )}
        <div
          className="gtk-box gtk-box-layout vertical title"
          data-valign="center"
          style={{ flex: 1 }}
          {...insensitive}
        >
          {title && (
            <span
              className="gtk-label title"
              id={titleId}
              tabIndex={titleCanSelect ? 0 : undefined}
              style={labelStyle(titleLines, titleCanSelect)}
              {...insensitive}
            >
              {labelText(title, useMarkup, useUnderline)}
            </span>
          )}
          {subtitle && (
            <span
              className="gtk-label subtitle"
              id={subtitleId}
              tabIndex={subtitleCanSelect ? 0 : undefined}
              style={labelStyle(subtitleLines, subtitleCanSelect)}
              {...insensitive}
            >
              {labelText(subtitle, useMarkup)}
            </span>
          )}
        </div>
        {(suffixWidget || children) && (
          <div className="gtk-box gtk-box-layout horizontal suffixes" {...insensitive}>
            {suffixWidget}
            {children}
          </div>
        )}
      </div>
    </div>,
  );
});
