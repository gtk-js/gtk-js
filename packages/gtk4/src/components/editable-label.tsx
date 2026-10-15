import React, {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkEditableLabelProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Current text. */
  text?: string;
  /** Whether currently in edit mode. */
  editing?: boolean;
  /** Callback when text is committed (Enter or blur). */
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
 * @see https://docs.gtk.org/gtk4/class.EditableLabel.html
 */
export const GtkEditableLabel = forwardRef<HTMLDivElement, GtkEditableLabelProps>(
  function GtkEditableLabel(
    {
      text: controlledText,
      editing: controlledEditing,
      onChanged,
      onEditingChanged,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      ...rest
    },
    ref,
  ) {
    const isTextControlled = controlledText !== undefined;
    const isEditingControlled = controlledEditing !== undefined;

    const [internalText, setInternalText] = useState("");
    const [internalEditing, setInternalEditing] = useState(false);
    const [editBuffer, setEditBuffer] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const text = isTextControlled ? controlledText : internalText;
    const editing = isEditingControlled ? controlledEditing : internalEditing;

    const startEditing = useCallback(() => {
      setEditBuffer(text);
      if (!isEditingControlled) setInternalEditing(true);
      onEditingChanged?.(true);
    }, [text, isEditingControlled, onEditingChanged]);

    const stopEditing = useCallback(
      (commit: boolean) => {
        if (commit) {
          if (!isTextControlled) setInternalText(editBuffer);
          onChanged?.(editBuffer);
        }
        if (!isEditingControlled) setInternalEditing(false);
        onEditingChanged?.(false);
      },
      [editBuffer, isTextControlled, isEditingControlled, onChanged, onEditingChanged],
    );

    // Focus input when entering edit mode
    useEffect(() => {
      if (editing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [editing]);

    const handleLabelClick = useCallback(() => {
      startEditing();
    }, [startEditing]);

    const handleInputKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          stopEditing(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          stopEditing(false);
        }
      },
      [stopEditing],
    );

    const handleInputBlur = useCallback(() => {
      // Auto-commit on blur (with small delay for focus restore)
      setTimeout(() => stopEditing(true), 100);
    }, [stopEditing]);

    const classes = ["gtk-editablelabel", "gtk-bin-layout"];
    if (editing) classes.push("editing");
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        <div className="gtk-stack">
          {editing ? (
            <input
              ref={inputRef}
              className="gtk-text"
              type="text"
              value={editBuffer}
              onChange={(e) => setEditBuffer(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
            />
          ) : (
            <span
              className="gtk-label"
              onClick={handleLabelClick}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  startEditing();
                }
              }}
            >
              {text}
            </span>
          )}
        </div>
      </div>
    );
  },
);
