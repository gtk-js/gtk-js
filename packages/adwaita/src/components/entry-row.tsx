import { type GtkInputPurpose, useIcon, useListBoxRow } from "@gtk-js/gtk4";
import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
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
  /** Tooltip shown when hovering the row (GtkWidget:tooltip-text). */
  tooltipText?: string;
  /** Focus the entry when it mounts. */
  autoFocus?: boolean;
  /** Extra content shown after the text, inside the editable area (e.g. indicators). */
  editableSuffix?: ReactNode;
  /** Receives key presses from the text entry. */
  onEntryKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Upstream animation parameters for the empty ↔ filled transition.
 * @see upstream/libadwaita/src/adw-entry-row.c — EMPTY_ANIMATION_DURATION, ADW_EASE
 * @see upstream/libadwaita/src/adw-easing.c — ADW_EASE = cubic-bezier(0.25, 0.1, 0.25, 1.0)
 */
const EMPTY_TRANSITION = "150ms cubic-bezier(0.25, 0.1, 0.25, 1.0)";

/**
 * AdwEntryRow — A list row with an integrated text entry.
 *
 * CSS node: row.entry
 *
 * The editable-area uses a custom layout matching upstream's allocate_editable_area:
 * title label stacks above the text input, with an animated transition between
 * empty (title centered as placeholder) and filled (title shrunk to subtitle above input).
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
    tooltipText,
    autoFocus,
    editableSuffix,
    onEntryKeyDown,
    className,
    ...rest
  },
  ref,
) {
  const [internalText, setInternalText] = useState("");
  const [focused, setFocused] = useState(false);
  const [textChanged, setTextChanged] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const text = controlledText ?? internalText;
  const hasContent = text.length > 0;
  const expanded = hasContent || focused;

  const ApplyIcon = useIcon("AdwEntryApply");
  const EditIcon = useIcon("DocumentEdit");

  const placeRow = useListBoxRow();
  const classes = ["gtk-row", "entry"];
  if (focused) classes.push("focused");
  if (className) classes.push(className);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (controlledText === undefined) setInternalText(val);
      setTextChanged(true);
      onChanged?.(val);
    },
    [controlledText, onChanged],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      onEntryKeyDown?.(e);
      if (e.key === "Enter") {
        if (showApplyButton && textChanged) {
          onApply?.();
          setTextChanged(false);
        } else {
          onEntryActivated?.();
        }
      }
    },
    [showApplyButton, textChanged, onApply, onEntryActivated, onEntryKeyDown],
  );

  return placeRow(
    <div
      ref={ref}
      className={classes.join(" ")}
      title={tooltipText}
      onClick={() => inputRef.current?.focus()}
      {...rest}
    >
      <div className="gtk-box gtk-box-layout horizontal header" style={{ alignItems: "center" }}>
        {prefixWidget && (
          <div className="gtk-box gtk-box-layout horizontal prefixes">{prefixWidget}</div>
        )}
        <div
          className="editable-area"
          style={{ flex: 1, padding: "0 6px", display: "flex", alignItems: "center" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              minWidth: 0,
              gap: expanded ? 3 : 0,
              transition: `gap ${EMPTY_TRANSITION}`,
            }}
          >
            <span
              className={`gtk-label title ${expanded ? "subtitle" : "dimmed"}`}
              style={{
                fontSize: expanded ? "0.75em" : "1em",
                transition: `font-size ${EMPTY_TRANSITION}`,
                transformOrigin: "left center",
              }}
            >
              {title}
            </span>
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
              style={{
                height: expanded ? "1.2em" : 0,
                opacity: expanded ? 1 : 0,
                overflow: "hidden",
                transition: `height ${EMPTY_TRANSITION}, opacity ${EMPTY_TRANSITION}`,
              }}
            />
          </div>
          {editableSuffix}
          {/* Upstream update_empty(): shown unless editing, or while the apply
              button is offered for changed text. */}
          {!focused && !(showApplyButton && textChanged) && EditIcon && (
            <span className="gtk-image edit-icon" style={{ display: "flex", alignItems: "center" }}>
              <EditIcon size={16} />
            </span>
          )}
          {showApplyButton && textChanged && ApplyIcon && (
            <button
              type="button"
              className="gtk-button suggested-action circular apply-button"
              onClick={(e) => {
                e.stopPropagation();
                onApply?.();
                setTextChanged(false);
              }}
            >
              <span className="gtk-image">
                <ApplyIcon size={16} />
              </span>
            </button>
          )}
        </div>
        {suffixWidget && (
          <div className="gtk-box gtk-box-layout horizontal suffixes">{suffixWidget}</div>
        )}
      </div>
    </div>,
  );
});
