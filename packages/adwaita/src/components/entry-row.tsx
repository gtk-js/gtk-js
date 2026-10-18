import { GtkButton, type GtkInputPurpose, GtkLabel, useIcon, useListBoxRow } from "@gtk-js/gtk4";
import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface AdwEntryRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  text?: string;
  showApplyButton?: boolean;
  inputPurpose?: GtkInputPurpose;
  maxLength?: number;
  prefixWidget?: ReactNode;
  suffixWidget?: ReactNode;
  onChanged?: (text: string) => void;
  onApply?: () => void;
  onEntryActivated?: () => void;
  /** Whether the text is visible (GtkText:visibility). Default: true. */
  visibility?: boolean;
  /** Whether the row is insensitive (GtkWidget:sensitive=false): it takes no input or focus. Default: false. */
  disabled?: boolean;
  /** Tooltip shown when hovering the row (GtkWidget:tooltip-text). */
  tooltipText?: string;
  /** Focus the entry when it mounts. */
  autoFocus?: boolean;
  /**
   * An icon shown in the edit icon's place while editing, like AdwPasswordEntryRow's
   * Caps Lock warning (adw_entry_row_set_indicator_icon_name() and _set_show_indicator()).
   */
  indicator?: ReactNode;
  /** The indicator's tooltip (adw_entry_row_set_indicator_tooltip()). */
  indicatorTooltip?: string;
  /** Receives key presses from the text entry. */
  onEntryKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Upstream animation parameters for the empty ↔ filled transition.
 * @see upstream/libadwaita/src/adw-entry-row.c — EMPTY_ANIMATION_DURATION, ADW_EASE
 * @see upstream/libadwaita/src/adw-easing.c — ADW_EASE = cubic-bezier(0.25, 0.1, 0.25, 1.0)
 */
const EMPTY_TRANSITION = "150ms cubic-bezier(0.25, 0.1, 0.25, 1.0)";

/** The space between the title and the text's line (adw-entry-row.c). */
const TITLE_SPACING = 3;

/** Widgets that take their own clicks, so they don't activate the row. */
const INTERACTIVE = "button, a[href], input, select, textarea, [tabindex], [role='button']";

/** Widgets the keyboard can move the focus to. */
const FOCUSABLE =
  "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";

/**
 * AdwEntryRow — A list row with an integrated text entry.
 *
 * CSS node: row.entry
 *
 * The editable-area uses a custom layout matching upstream's allocate_editable_area:
 * the text fills it but the icon, and the title is centered as a placeholder while
 * the row is empty, or shrinks to a subtitle above the text's line.
 *
 * @see upstream/libadwaita/src/adw-entry-row.c — allocate_editable_area
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.EntryRow.html
 */
export const AdwEntryRow = forwardRef<HTMLDivElement, AdwEntryRowProps>(function AdwEntryRow(
  {
    title,
    text: controlledText,
    showApplyButton = false,
    inputPurpose = "free-form",
    maxLength = 0,
    prefixWidget,
    suffixWidget,
    onChanged,
    onApply,
    onEntryActivated,
    visibility = true,
    disabled = false,
    tooltipText,
    autoFocus,
    indicator,
    indicatorTooltip,
    onEntryKeyDown,
    className,
    onMouseDown,
    onClick,
    ...rest
  },
  ref,
) {
  const [internalText, setInternalText] = useState("");
  const [focused, setFocused] = useState(false);
  const [textChanged, setTextChanged] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const titleId = useId();

  // Hiding the apply button drops the pending change (adw_entry_row_set_show_apply_button()).
  if (!showApplyButton && textChanged) setTextChanged(false);

  const text = controlledText ?? internalText;
  const hasContent = text.length > 0;
  // update_empty(): a pending change keeps the title up as well.
  const expanded = hasContent || focused || textChanged;

  // allocate_editable_area(): the text fills the slot, with its line centered
  // below the title as a subtitle (which it is while the row is expanded) and
  // TITLE_SPACING. Padded to that one line, the input draws its text there.
  // Again as the slot or title resize, and once the row is in the page (a
  // preferences group adds its list after its rows mount).
  const subtitleHeight = useRef(0);
  useLayoutEffect(() => {
    const titleEl = titleRef.current;
    const input = inputRef.current;
    const slot = input?.parentElement;
    if (!titleEl || !input || !slot) return;
    const allocate = () => {
      const textHeight = parseFloat(getComputedStyle(input).lineHeight);
      if (!input.isConnected || Number.isNaN(textHeight)) return;
      slot.style.setProperty("--text-height", `${textHeight}px`);
      if (expanded || !subtitleHeight.current) {
        subtitleHeight.current = titleEl.getBoundingClientRect().height;
      }
      const height = slot.clientHeight;
      const top = Math.max(
        0,
        Math.trunc((height + subtitleHeight.current - textHeight + TITLE_SPACING) / 2),
      );
      input.style.height = `${textHeight}px`;
      input.style.paddingTop = `${top}px`;
      input.style.paddingBottom = `${Math.max(0, height - top - textHeight)}px`;
    };
    allocate();
    const observer = new ResizeObserver(allocate);
    observer.observe(titleEl);
    observer.observe(slot);
    return () => observer.disconnect();
  }, [expanded]);

  const EditIcon = useIcon("DocumentEdit");

  const placeRow = useListBoxRow();
  const classes = ["gtk-row", "entry", "activatable"];
  if (focused) classes.push("focused");
  if (className) classes.push(className);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (controlledText === undefined) setInternalText(val);
      // text_changed_cb(): an edit is pending only with the apply button.
      if (showApplyButton) setTextChanged(true);
      onChanged?.(val);
    },
    [controlledText, showApplyButton, onChanged],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      onEntryKeyDown?.(e);
      if (e.key === "Enter") {
        if (textChanged) {
          onApply?.();
          setTextChanged(false);
        } else {
          onEntryActivated?.();
        }
      }
      // text_keynav_failed_cb(): Left or Right past the end of the text moves
      // the focus to the row's next widget on that side.
      const arrow = e.key === "ArrowLeft" || e.key === "ArrowRight";
      if (!arrow || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented) return;
      const input = e.currentTarget;
      const rtl = getComputedStyle(input).direction === "rtl";
      const forward = (e.key === "ArrowRight") !== rtl;
      const end = forward ? input.value.length : 0;
      if (input.selectionStart !== end || input.selectionEnd !== end) return;
      const widgets = [
        ...(input.closest(".header")?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
      ]
        .filter((el) => el !== input && !el.closest("[inert]") && el.getClientRects().length > 0)
        .filter((el) => {
          const after = input.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
          return forward ? after : !after;
        });
      const next = forward ? widgets[0] : widgets.at(-1);
      if (next) {
        e.preventDefault();
        next.focus();
      }
    },
    [textChanged, onApply, onEntryActivated, onEntryKeyDown],
  );

  return placeRow(
    <div
      ref={ref}
      className={classes.join(" ")}
      title={tooltipText}
      data-disabled={disabled || undefined}
      // pressed_cb(): a press on the row itself, its header, its prefix and
      // suffix boxes or the indicator focuses the text. Its widgets, the text
      // included, take their own presses.
      onMouseDown={(e) => {
        onMouseDown?.(e);
        const target = e.target as Element;
        const header = e.currentTarget.firstElementChild;
        const own =
          target === e.currentTarget ||
          target === header ||
          (target.parentElement === header && target.matches(".prefixes, .suffixes")) ||
          target.closest(".editable-area > .indicator");
        if (disabled || e.button !== 0 || !own) return;
        e.preventDefault();
        inputRef.current?.focus();
      }}
      // GtkListBox activates the row on the other clicks no widget takes,
      // which focuses the text (adw_entry_row_grab_focus()).
      onClick={(e) => {
        onClick?.(e);
        const widget = (e.target as Element).closest(INTERACTIVE);
        const own = !widget || !e.currentTarget.contains(widget) || widget === e.currentTarget;
        if (disabled || !own) return;
        inputRef.current?.focus();
      }}
      {...rest}
    >
      <div className="gtk-box gtk-box-layout horizontal header" style={{ alignItems: "center" }}>
        {prefixWidget && (
          <div className="gtk-box gtk-box-layout horizontal prefixes" inert={disabled || undefined}>
            {prefixWidget}
          </div>
        )}
        <div
          className="editable-area"
          style={{
            flex: 1,
            minWidth: 0,
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* The text's slot: the editable area but the icon. Expanded, it
              keeps TITLE_SPACING and the text's line below the title, which
              puts the title where allocate_editable_area() does. */}
          <div
            style={{
              position: "relative",
              alignSelf: "stretch",
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              // GtkText's line (see reset.css) until it's measured.
              paddingBottom: expanded
                ? `calc(${TITLE_SPACING}px + var(--text-height, round(up, 1lh, 1px)))`
                : 0,
              transition: `padding-bottom ${EMPTY_TRANSITION}`,
            }}
          >
            <GtkLabel
              ref={titleRef}
              id={titleId}
              className={`title ${expanded ? "subtitle" : "dimmed"}`}
              label={title}
              ellipsize="end"
              xalign={0}
              data-disabled={disabled || undefined}
              // Expanded, the title is a subtitle: the theme makes it smaller
              // (row label.subtitle in _lists.scss). Presses go through it to
              // the text (can-target=False).
              style={{
                alignSelf: "flex-start",
                maxWidth: "100%",
                pointerEvents: "none",
                transition: `font-size ${EMPTY_TRANSITION}`,
              }}
            />
            <input
              ref={inputRef}
              className="gtk-text"
              type={inputPurpose === "password" || !visibility ? "password" : "text"}
              autoFocus={autoFocus}
              spellCheck={
                inputPurpose === "free-form" || inputPurpose === "name" ? undefined : false
              }
              value={text}
              maxLength={maxLength > 0 ? maxLength : undefined}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={disabled}
              aria-labelledby={titleId}
              style={{
                // GtkText fills the slot at all times, so the pointer is an
                // I-beam all over it (its height is allocate()'s).
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                // Only its opacity animates (empty_animation_value_cb()). Shown,
                // it has the theme's (row.entry:disabled text).
                opacity: expanded ? undefined : 0,
                transition: `opacity ${EMPTY_TRANSITION}`,
              }}
            />
          </div>
          {/* update_empty(): the indicator shows while editing. */}
          {focused && indicator && (
            <span
              className="gtk-image indicator"
              title={indicatorTooltip}
              style={{ display: "flex", alignItems: "center" }}
            >
              {indicator}
            </span>
          )}
          {/* Upstream update_empty(): shown unless editing, or while the apply
              button is offered for changed text. */}
          {!focused && !textChanged && EditIcon && (
            <span
              className="gtk-image edit-icon"
              data-disabled={disabled || undefined}
              style={{ display: "flex", alignItems: "center" }}
            >
              <EditIcon size={16} />
            </span>
          )}
          {textChanged && (
            <GtkButton
              type="button"
              iconName="AdwEntryApply"
              className="suggested-action circular apply-button"
              valign="center"
              tooltipText="Apply"
              // It doesn't take the focus when clicked, and gives it back to
              // the text when it has it (apply_button_clicked_cb()).
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                if (document.activeElement === e.currentTarget) inputRef.current?.focus();
                setTextChanged(false);
                onApply?.();
              }}
            />
          )}
        </div>
        {suffixWidget && (
          <div className="gtk-box gtk-box-layout horizontal suffixes" inert={disabled || undefined}>
            {suffixWidget}
          </div>
        )}
      </div>
    </div>,
  );
});
