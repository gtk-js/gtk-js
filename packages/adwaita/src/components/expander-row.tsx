import { GtkBox, GtkRevealer, GtkSwitch, useIcon, useListBoxRow, wrapStyle } from "@gtk-js/gtk4";
import React, {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface AdwExpanderRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  expanded?: boolean;
  showEnableSwitch?: boolean;
  /** Whether the row can expand. Turning it on expands the row, off collapses it. Default: true. */
  enableExpansion?: boolean;
  /** Maximum lines before the title ellipsizes. 0 = unlimited. */
  titleLines?: number;
  /** Maximum lines before the subtitle ellipsizes. 0 = unlimited. */
  subtitleLines?: number;
  prefixWidget?: ReactNode;
  suffixWidget?: ReactNode;
  /**
   * Whether the row is insensitive (disabled): it takes no input, nor do the
   * widgets in it. Default: false.
   */
  disabled?: boolean;
  /** Child rows (shown when expanded). */
  children?: ReactNode;
  onExpandedChanged?: (expanded: boolean) => void;
  onEnableExpansionChanged?: (enabled: boolean) => void;
}

/** Wraps word-char, ellipsizing after `lines` lines if set, like AdwActionRow's labels. */
function labelStyle(lines: number): CSSProperties {
  if (lines <= 0) return wrapStyle("word-char");
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    ...wrapStyle("word-char"),
  };
}

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

/**
 * Moves the focus to the previous or next widget in the focus chain, like
 * keynav_failed_cb() does with gtk_widget_child_focus() on the toplevel.
 */
function moveFocus(from: HTMLElement, forward: boolean): boolean {
  const chain = Array.from(from.ownerDocument.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el === from ||
      (el.tabIndex >= 0 &&
        !el.matches(":disabled") &&
        !el.closest("[inert]") &&
        (typeof el.checkVisibility === "function"
          ? el.checkVisibility({ visibilityProperty: true })
          : el.getClientRects().length > 0)),
  );
  const next = chain[chain.indexOf(from) + (forward ? 1 : -1)];
  next?.focus();
  return next !== undefined;
}

// A widget in the header that takes a click (a button, the enable switch, …)
// keeps GtkListBox from activating the header row.
const INTERACTIVE =
  "a[href], button, input, select, textarea, [role=button], [role=switch], [role=checkbox], [role=radio], [tabindex]";

/**
 * AdwExpanderRow — A list row that expands to show child rows.
 *
 * The row is :checked while expanded (adw_expander_row_set_expanded()), and
 * its child rows slide in and out in a GtkRevealer (slide-up).
 *
 * CSS node:
 *   row.expander[:checked][.empty]
 *     └── box.vertical
 *         ├── list
 *         │   └── row.header.activatable
 *         │       └── box.header
 *         │           ├── [box.prefixes > box]
 *         │           ├── box.title
 *         │           └── box.suffixes
 *         │               ├── [box.suffixes]
 *         │               ├── [switch]
 *         │               └── image.expander-row-arrow
 *         └── revealer
 *             └── list.nested
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ExpanderRow.html
 * @see upstream/libadwaita/src/adw-expander-row.ui
 */
export const AdwExpanderRow = forwardRef<HTMLDivElement, AdwExpanderRowProps>(
  function AdwExpanderRow(
    {
      title,
      subtitle,
      expanded: controlledExpanded,
      showEnableSwitch = false,
      enableExpansion: controlledEnable,
      titleLines = 0,
      subtitleLines = 0,
      prefixWidget,
      suffixWidget,
      disabled = false,
      children,
      onExpandedChanged,
      onEnableExpansionChanged,
      className,
      ...rest
    },
    ref,
  ) {
    const isControlled = controlledExpanded !== undefined;
    const [internalExpanded, setInternalExpanded] = useState(false);
    const [internalEnable, setInternalEnable] = useState(true);
    const requested = isControlled ? controlledExpanded : internalExpanded;
    const enableExpansion = controlledEnable ?? internalEnable;
    // It can't expand while expansion is disabled (adw_expander_row_set_expanded()).
    const expanded = requested && enableExpansion;

    const ArrowIcon = useIcon("AdwExpanderArrow");

    const setExpanded = (next: boolean) => {
      if (next === requested) return;
      if (!isControlled) setInternalExpanded(next);
      onExpandedChanged?.(next);
    };

    // Like activate_cb().
    const toggle = () => {
      if (!disabled && enableExpansion) setExpanded(!expanded);
    };

    const setEnableExpansion = (enable: boolean) => {
      if (controlledEnable === undefined) setInternalEnable(enable);
      onEnableExpansionChanged?.(enable);
    };

    // Enabling expansion expands the row and disabling it collapses it
    // (adw_expander_row_set_enable_expansion()).
    const prevEnable = useRef(enableExpansion);
    useLayoutEffect(() => {
      if (prevEnable.current === enableExpansion) return;
      prevEnable.current = enableExpansion;
      setExpanded(enableExpansion);
    });

    // Up and Down move the focus between the nested rows, like
    // gtk_list_box_move_cursor(), and on past them (keynav_failed_cb()).
    const onNestedKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      const row = e.target as HTMLElement;
      if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || row.parentElement !== e.currentTarget)
        return;
      const forward = e.key === "ArrowDown";
      let next = forward ? row.nextElementSibling : row.previousElementSibling;
      while (next && !(next instanceof HTMLElement && next.tabIndex >= 0))
        next = forward ? next.nextElementSibling : next.previousElementSibling;
      if (next instanceof HTMLElement) next.focus();
      else if (!moveFocus(row, forward)) return;
      e.preventDefault();
    };

    const placeRow = useListBoxRow();
    const classes = ["gtk-row", "expander"];
    if (!children || React.Children.count(children) === 0) classes.push("empty");
    if (className) classes.push(className);

    return placeRow(
      <div
        ref={ref}
        className={classes.join(" ")}
        inert={disabled || undefined}
        {...rest}
        // After `rest`, which has GtkListBox's selection state.
        data-checked={expanded || undefined}
        data-disabled={disabled || undefined}
      >
        <div className="gtk-box gtk-box-layout vertical">
          <div className="gtk-list">
            <div
              className="gtk-row header activatable"
              role="button"
              aria-expanded={expanded}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? undefined : 0}
              data-disabled={disabled || undefined}
              onClick={(e) => {
                const target = e.target as Element;
                if (
                  e.currentTarget.contains(target) &&
                  target.closest(INTERACTIVE) === e.currentTarget
                )
                  toggle();
              }}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggle();
                } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  // The header is its list's only row (keynav_failed_cb()).
                  if (moveFocus(e.currentTarget, e.key === "ArrowDown")) e.preventDefault();
                }
              }}
            >
              <div
                className="gtk-box gtk-box-layout horizontal header"
                style={{ alignItems: "center" }}
              >
                {prefixWidget && (
                  <div className="gtk-box gtk-box-layout horizontal prefixes">
                    {/* Like adw_expander_row_add_prefix(). */}
                    <GtkBox spacing={12}>{prefixWidget}</GtkBox>
                  </div>
                )}
                <div className="gtk-box gtk-box-layout vertical title" style={{ flex: 1 }}>
                  <span
                    className="gtk-label title"
                    data-disabled={disabled || undefined}
                    style={labelStyle(titleLines)}
                  >
                    {title}
                  </span>
                  {subtitle && (
                    <span
                      className="gtk-label subtitle"
                      data-disabled={disabled || undefined}
                      style={labelStyle(subtitleLines)}
                    >
                      {subtitle}
                    </span>
                  )}
                </div>
                {/* The header row's suffixes: the expander's own, the switch and the arrow. */}
                <div className="gtk-box gtk-box-layout horizontal suffixes">
                  {suffixWidget && (
                    <div className="gtk-box gtk-box-layout horizontal suffixes">{suffixWidget}</div>
                  )}
                  {showEnableSwitch && (
                    <GtkSwitch
                      active={enableExpansion}
                      valign="center"
                      data-disabled={disabled || undefined}
                      onStateSet={setEnableExpansion}
                      // The switch takes the click, from the outer list too.
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <span
                    className="gtk-image expander-row-arrow"
                    data-disabled={disabled || !enableExpansion || undefined}
                  >
                    {ArrowIcon && <ArrowIcon size={16} />}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <GtkRevealer revealChild={expanded} transitionType="slide-up">
            <div className="gtk-list nested" onKeyDown={onNestedKeyDown}>
              {children}
            </div>
          </GtkRevealer>
        </div>
      </div>,
    );
  },
);
