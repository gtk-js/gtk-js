import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkEditableLabelProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Current text. */
  text?: string;
  /** Whether currently in edit mode. */
  editing?: boolean;
  /** Whether the widget is insensitive (disabled). Default: false. */
  disabled?: boolean;
  /** Callback when text is committed (Enter or focus-out). */
  onChanged?: (text: string) => void;
  /** Callback when editing state changes. */
  onEditingChanged?: (editing: boolean) => void;
}

/**
 * GtkEditableLabel — A label that can be edited inline.
 *
 * CSS node:
 *   editablelabel[.editing]
 *     └── stack
 *         ├── label
 *         └── text (input, visible when editing)
 *
 * The editablelabel is the focus widget. A press on the label or Enter starts
 * editing; Enter in the text commits, Escape cancels, and focus leaving the
 * widget for 100ms commits.
 *
 * @see https://docs.gtk.org/gtk4/class.EditableLabel.html
 * @see upstream/gtk/gtk/gtkeditablelabel.c
 */
export const GtkEditableLabel = forwardRef<HTMLDivElement, GtkEditableLabelProps>(
  function GtkEditableLabel(
    {
      text: controlledText,
      editing: controlledEditing,
      disabled = false,
      onChanged,
      onEditingChanged,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onKeyDown,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const isTextControlled = controlledText !== undefined;
    const isEditingControlled = controlledEditing !== undefined;

    const [internalText, setInternalText] = useState("");
    const [internalEditing, setInternalEditing] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

    const text = isTextControlled ? controlledText : internalText;
    const editing = isEditingControlled ? controlledEditing : internalEditing;

    // The text page shows the label's text until the user types. Starting or
    // stopping editing, or setting the text, resets it: GtkEditable:text is
    // delegated to the GtkText (gtk_editable_label_stop_editing()).
    const [edited, setEdited] = useState<string | null>(null);
    const [synced, setSynced] = useState({ text, editing });
    if (synced.text !== text || synced.editing !== editing) {
      setSynced({ text, editing });
      setEdited(null);
    }
    const value = edited ?? text;

    const startEditing = useCallback(() => {
      if (disabled || editing) return;
      if (!isEditingControlled) setInternalEditing(true);
      onEditingChanged?.(true);
    }, [disabled, editing, isEditingControlled, onEditingChanged]);

    const stopEditing = useCallback(
      (commit: boolean) => {
        if (!editing) return;
        if (commit) {
          if (!isTextControlled) setInternalText(value);
          onChanged?.(value);
        }
        if (!isEditingControlled) setInternalEditing(false);
        onEditingChanged?.(false);
      },
      [editing, value, isTextControlled, isEditingControlled, onChanged, onEditingChanged],
    );

    // Starting to edit, however it's started, focuses the text, which selects
    // it (gtk_editable_label_start_editing()).
    useLayoutEffect(() => {
      if (editing) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [editing]);

    // Focus leaving the widget commits after 100ms, unless it came back by then
    // (stop_editing_soon()). The timer calls the latest stopEditing.
    const stopEditingRef = useRef(stopEditing);
    stopEditingRef.current = stopEditing;
    useEffect(() => () => clearTimeout(blurTimer.current), []);

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      onBlur?.(e);
      if (!editing || rootRef.current?.contains(e.relatedTarget as Node | null)) return;
      clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(() => {
        if (!rootRef.current?.contains(document.activeElement)) stopEditingRef.current(true);
      }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || disabled) return;
      if (!editing) {
        // The editing.start shortcut is Return/ISO_Enter/KP_Enter only.
        if (e.key === "Enter" && e.target === e.currentTarget) {
          e.preventDefault();
          startEditing();
        }
        return;
      }
      // The input method takes the keys while composing (gtk_event_controller_key_set_im_context()).
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      // Enter activates the text, which commits; Escape is editing.stop(FALSE).
      // Either gives the focus back to the editablelabel, like stop_editing(),
      // before the text is hidden and the browser drops it.
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        stopEditing(e.key === "Enter");
        rootRef.current?.focus();
      }
    };

    const classes = ["gtk-editablelabel", "gtk-bin-layout"];
    if (editing) classes.push("editing");
    if (className) classes.push(className);

    return (
      <div
        ref={rootRef}
        className={classes.join(" ")}
        tabIndex={disabled ? undefined : editing ? -1 : 0}
        aria-disabled={disabled || undefined}
        data-disabled={disabled || undefined}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        {...rest}
      >
        {/* Both pages stay in the homogeneous stack; the hidden one only sizes it. */}
        <div className="gtk-stack" data-disabled={disabled || undefined}>
          <span
            className="gtk-label"
            aria-hidden={editing || undefined}
            data-disabled={disabled || undefined}
            onMouseDown={(e) => {
              // A primary press starts editing (clicked_cb()).
              if (e.button !== 0 || disabled) return;
              e.preventDefault();
              startEditing();
            }}
          >
            {text}
          </span>
          <input
            ref={inputRef}
            className="gtk-text"
            type="text"
            aria-hidden={!editing || undefined}
            tabIndex={editing ? undefined : -1}
            disabled={disabled}
            value={value}
            onChange={(e) => setEdited(e.target.value)}
          />
        </div>
      </div>
    );
  },
);
