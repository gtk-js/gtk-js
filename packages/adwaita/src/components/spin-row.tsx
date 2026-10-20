import {
  GtkSpinButton,
  type GtkSpinButtonUpdatePolicy,
  linesStyle,
  tooltipAttrs,
  useListBoxRow,
} from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";

export interface AdwSpinRowProps extends HTMLAttributes<HTMLDivElement> {
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
  /** Suffix widgets, after the spin button. */
  suffixWidget?: ReactNode;
  /** Tooltip shown when hovering the row (GtkWidget:tooltip-text). */
  tooltipText?: string;
  /** Current value. */
  value?: number;
  /** Minimum value. Default: 0. */
  min?: number;
  /** Maximum value. Default: 100. */
  max?: number;
  /** Step increment. Default: 1. */
  step?: number;
  /** Page increment, for PageUp/PageDown. Default: 10. */
  pageStep?: number;
  /** How much a held button or key speeds up, every 6 steps, up to `pageStep`. Default: 0. */
  climbRate?: number;
  /** Decimal places to display. Default: 0. */
  digits?: number;
  /** Only allow digits, a leading sign and a decimal point to be typed. Default: false. */
  numeric?: boolean;
  /** Round committed values to the nearest step. Default: false. */
  snapToTicks?: boolean;
  /** Spinning past a bound the value is at goes to the other bound. Default: false. */
  wrap?: boolean;
  /** Whether typed values out of range are clamped ("always") or dropped ("if-valid"). Default: "always". */
  updatePolicy?: GtkSpinButtonUpdatePolicy;
  /** Whether the row is insensitive (GtkWidget:sensitive = false). Default: false. */
  disabled?: boolean;
  /** Callback on value change. */
  onValueChanged?: (value: number) => void;
  /** Callback when spinning wraps around a bound (AdwSpinRow::wrapped). */
  onWrapped?: () => void;
  /** Callback when a click outside the spin button activates the row (AdwActionRow::activated). */
  onActivated?: () => void;
  /** More suffix widgets, after `suffixWidget`. */
  children?: ReactNode;
}

// The labels wrap word-char, and ellipsize after `lines` lines when set
// (adw_action_row_set_title_lines()).
// Widgets that take their own clicks, so the row doesn't get them.
const CLAIMS = ".gtk-spinbutton, button, input, textarea, select, a[href], [tabindex]";

/**
 * AdwSpinRow — An ActionRow with an integrated GtkSpinButton.
 *
 * CSS node:
 *   row.activatable.spin[.focused]
 *     └── box.header
 *         ├── box.prefixes
 *         ├── box.title (vertical)
 *         │   ├── label.title
 *         │   └── label.subtitle
 *         └── box.suffixes
 *             └── spinbutton
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.SpinRow.html
 */
export const AdwSpinRow = forwardRef<HTMLDivElement, AdwSpinRowProps>(function AdwSpinRow(
  {
    title,
    subtitle,
    titleLines = 0,
    subtitleLines = 0,
    prefixWidget,
    suffixWidget,
    tooltipText,
    value,
    min = 0,
    max = 100,
    step = 1,
    pageStep = 10,
    climbRate = 0,
    digits = 0,
    numeric = false,
    snapToTicks = false,
    wrap = false,
    updatePolicy = "always",
    disabled = false,
    onValueChanged,
    onWrapped,
    onActivated,
    children,
    className,
    onMouseDown,
    onClick,
    ...rest
  },
  ref,
) {
  const placeRow = useListBoxRow();
  const titleId = useId();
  const subtitleId = useId();
  const spinRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  // GTK doesn't pick insensitive widgets, so they get no hover or press
  // background; without .activatable the theme draws none.
  const classes = disabled ? ["gtk-row", "spin"] : ["gtk-row", "activatable", "spin"];
  // While the spin button has the focus (spin_button_state_flags_changed_cb()).
  if (focused && !disabled) classes.push("focused");
  if (className) classes.push(className);
  // Insensitivity propagates to the children (gtk_widget_set_sensitive()).
  const insensitive = disabled || undefined;

  const text = () => spinRef.current?.querySelector<HTMLInputElement>("input.gtk-text");
  const claimed = (e: MouseEvent<HTMLDivElement>) => {
    const claim = (e.target as Element).closest(CLAIMS);
    return !!claim && claim !== e.currentTarget && e.currentTarget.contains(claim);
  };
  // The row itself, its header or its prefix/suffix boxes, where AdwActionRow's
  // own press gesture runs (adw-action-row.c pressed_cb()).
  const onFrame = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    return target === e.currentTarget || target.matches(".header, .prefixes, .suffixes");
  };

  return placeRow(
    <div
      ref={ref}
      className={classes.join(" ")}
      {...tooltipAttrs(tooltipText)}
      aria-disabled={insensitive}
      data-disabled={insensitive}
      onMouseDown={(e) => {
        if (!disabled && !claimed(e)) {
          // The focus stays in the text, and a press on the row's frame moves
          // it there without selecting (gtk_text_grab_focus_without_selecting()).
          e.preventDefault();
          if (onFrame(e)) text()?.focus();
        }
        onMouseDown?.(e);
      }}
      onClick={(e) => {
        // Elsewhere, like on the title, GtkListBox activates the row on the
        // first click and focuses it, i.e. its text, which selects it
        // (gtk_list_box_select_and_activate(), adw_spin_row_grab_focus()).
        if (!disabled && !claimed(e) && !onFrame(e) && e.detail <= 1) {
          text()?.focus();
          text()?.select();
          onActivated?.();
        }
        onClick?.(e);
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
        {/* It doesn't expand, the suffixes do (adw_action_row_set_expand_suffixes()). */}
        <div
          className="gtk-box gtk-box-layout vertical title"
          data-valign="center"
          data-disabled={insensitive}
        >
          <span
            className="gtk-label title"
            id={titleId}
            data-disabled={insensitive}
            style={linesStyle(titleLines)}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="gtk-label subtitle"
              id={subtitleId}
              data-disabled={insensitive}
              style={linesStyle(subtitleLines)}
            >
              {subtitle}
            </span>
          )}
        </div>
        <div className="gtk-box gtk-box-layout horizontal suffixes" data-disabled={insensitive}>
          {/* adw-spin-row.ui, with the scroll controller off (adw_spin_row_init()). */}
          <GtkSpinButton
            ref={spinRef}
            value={value}
            min={min}
            max={max}
            step={step}
            pageStep={pageStep}
            climbRate={climbRate}
            digits={digits}
            numeric={numeric}
            snapToTicks={snapToTicks}
            wrap={wrap}
            updatePolicy={updatePolicy}
            disabled={disabled}
            onValueChanged={onValueChanged}
            onWrapped={onWrapped}
            valign="center"
            hexpand
            xalign={1}
            spinOnScroll={false}
            aria-labelledby={titleId}
            aria-describedby={subtitle ? subtitleId : undefined}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
            }}
          />
          {suffixWidget}
          {children}
        </div>
      </div>
    </div>,
  );
});
