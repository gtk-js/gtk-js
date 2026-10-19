import { GtkSwitch, tooltipAttrs, useListBoxRow, wrapStyle } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";

export interface AdwSwitchRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Row title text. */
  title: string;
  /** Subtitle text. */
  subtitle?: string;
  /** Maximum lines before title ellipsizes. 0 = unlimited. */
  titleLines?: number;
  /** Maximum lines before subtitle ellipsizes. 0 = unlimited. */
  subtitleLines?: number;
  /** Prefix widgets (left side). */
  prefixWidget?: ReactNode;
  /** Suffix widgets, after the switch. */
  suffixWidget?: ReactNode;
  /** Tooltip shown when hovering the row (GtkWidget:tooltip-text). */
  tooltipText?: string;
  /** Whether the switch is on. */
  active?: boolean;
  /** Callback when toggle state changes. */
  onActiveChanged?: (active: boolean) => void;
  /** Callback when the row is activated (click, Enter or Space), after it toggles the switch. */
  onActivated?: () => void;
  /** Whether the row is insensitive (GtkWidget:sensitive = false). Default: false. */
  disabled?: boolean;
  /** More suffix widgets, after `suffixWidget`. */
  children?: ReactNode;
}

// The labels wrap word-char, and ellipsize after `lines` lines when set
// (adw_action_row_set_title_lines()).
function linesStyle(lines: number): React.CSSProperties {
  if (lines <= 0) return wrapStyle("word-char");
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    ...wrapStyle("word-char"),
  };
}

/**
 * AdwSwitchRow — An ActionRow with an integrated GtkSwitch.
 *
 * CSS node:
 *   row.activatable
 *     └── box.header
 *         ├── box.prefixes
 *         ├── box.title (vertical)
 *         │   ├── label.title
 *         │   └── label.subtitle
 *         └── box.suffixes
 *             └── switch
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.SwitchRow.html
 */
export const AdwSwitchRow = forwardRef<HTMLDivElement, AdwSwitchRowProps>(function AdwSwitchRow(
  {
    title,
    subtitle,
    titleLines = 0,
    subtitleLines = 0,
    prefixWidget,
    suffixWidget,
    tooltipText,
    active: controlledActive,
    onActiveChanged,
    onActivated,
    disabled = false,
    children,
    className,
    onClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const isControlled = controlledActive !== undefined;
  const [internalActive, setInternalActive] = useState(false);
  const active = isControlled ? controlledActive : internalActive;
  const switchRef = useRef<HTMLDivElement>(null);

  const setActive = useCallback(
    (next: boolean) => {
      if (disabled) return;
      if (!isControlled) setInternalActive(next);
      onActiveChanged?.(next);
    },
    [disabled, isControlled, onActiveChanged],
  );

  // Activating the row toggles its switch, then emits ::activated
  // (adw_action_row_activate_real()).
  const activate = () => {
    setActive(!active);
    onActivated?.();
  };

  const placeRow = useListBoxRow();
  // GTK doesn't pick insensitive widgets, so they get no hover or press
  // background; without .activatable the theme draws none.
  const classes = disabled ? ["gtk-row"] : ["gtk-row", "activatable"];
  if (className) classes.push(className);
  // Insensitivity propagates to the children (gtk_widget_set_sensitive()).
  const insensitive = disabled || undefined;

  return placeRow(
    <div
      ref={ref}
      role="switch"
      aria-checked={active}
      aria-disabled={insensitive}
      data-disabled={insensitive}
      className={classes.join(" ")}
      {...tooltipAttrs(tooltipText)}
      // The row takes the focus, and Enter/Space activate it (GtkWindow's
      // activate-focus binding).
      tabIndex={disabled ? undefined : 0}
      onClick={(e) => {
        if (disabled) return;
        // The switch claims its own clicks (gtk_switch_click_gesture_released()).
        if (switchRef.current?.contains(e.target as Node)) return;
        // GtkListBox activates a row on the first click only (n_press == 1).
        if (e.detail <= 1) activate();
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (!disabled && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          activate();
        }
        onKeyDown?.(e);
      }}
      {...rest}
    >
      <div
        className="gtk-box gtk-box-layout horizontal header"
        data-disabled={insensitive}
        // Nothing in an insensitive row takes pointer input.
        style={disabled ? { pointerEvents: "none" } : undefined}
      >
        {prefixWidget && (
          <div className="gtk-box gtk-box-layout horizontal prefixes" data-disabled={insensitive}>
            {prefixWidget}
          </div>
        )}
        <div
          className="gtk-box gtk-box-layout vertical title"
          data-valign="center"
          data-disabled={insensitive}
          style={{ flex: 1 }}
        >
          <span
            className="gtk-label title"
            data-disabled={insensitive}
            style={linesStyle(titleLines)}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="gtk-label subtitle"
              data-disabled={insensitive}
              style={linesStyle(subtitleLines)}
            >
              {subtitle}
            </span>
          )}
        </div>
        {/* The switch comes first: adw_switch_row_init() adds it before any other suffix. */}
        <div className="gtk-box gtk-box-layout horizontal suffixes" data-disabled={insensitive}>
          {/* It can't take the focus, and the row is the switch AT sees (adw_switch_row_init()). */}
          <GtkSwitch
            ref={switchRef}
            active={active}
            onStateSet={setActive}
            valign="center"
            tabIndex={-1}
            aria-hidden
            data-disabled={insensitive}
            onMouseDown={(e) => e.preventDefault()}
          />
          {suffixWidget}
          {children}
        </div>
      </div>
    </div>,
  );
});
