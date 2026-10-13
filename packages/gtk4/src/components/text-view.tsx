import React, { forwardRef, type TextareaHTMLAttributes, useCallback } from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkInputPurpose,
  type GtkJustification,
  type GtkWrapMode,
} from "../types.ts";

export interface GtkTextViewProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "wrap">,
    GtkAlignProps {
  /** Whether text is editable. Default: true. */
  editable?: boolean;
  /** Whether the cursor is visible. Default: true. */
  cursorVisible?: boolean;
  /** Line wrapping mode. Default: "none". */
  wrapMode?: GtkWrapMode | "none";
  /** Text justification. Default: "left". */
  justification?: GtkJustification;
  /** Left margin in pixels. Default: 0. */
  leftMargin?: number;
  /** Right margin in pixels. Default: 0. */
  rightMargin?: number;
  /** Top margin in pixels. Default: 0. */
  topMargin?: number;
  /** Bottom margin in pixels. Default: 0. */
  bottomMargin?: number;
  /** First-line indent in pixels. Default: 0. */
  indent?: number;
  /** Use monospace font. Default: false. */
  monospace?: boolean;
  /** Input purpose hint. Default: "free-form". */
  inputPurpose?: GtkInputPurpose;
  /** Whether Tab inserts a tab character. Default: false. */
  acceptsTab?: boolean;
  /** Callback when text changes. */
  onChanged?: (text: string) => void;
}

/**
 * GtkTextView — A multi-line text editor widget.
 *
 * CSS node:
 *   textview.view
 *     └── text
 *
 * @see https://docs.gtk.org/gtk4/class.TextView.html
 */
export const GtkTextView = forwardRef<HTMLTextAreaElement, GtkTextViewProps>(function GtkTextView(
  {
    editable = true,
    cursorVisible = true,
    wrapMode = "none",
    justification = "left",
    leftMargin = 0,
    rightMargin = 0,
    topMargin = 0,
    bottomMargin = 0,
    indent = 0,
    monospace = false,
    inputPurpose = "free-form",
    acceptsTab = false,
    onChanged,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    onChange,
    onKeyDown,
    disabled,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-textview", "view"];
  if (monospace) classes.push("monospace");
  if (className) classes.push(className);

  const textAlign =
    justification === "left"
      ? "start"
      : justification === "right"
        ? "end"
        : justification === "fill"
          ? "justify"
          : justification;

  const cssWrap = wrapMode === "none" ? "off" : wrapMode === "char" ? "hard" : "soft";

  const cssStyle: React.CSSProperties = {
    textAlign,
    paddingLeft: leftMargin,
    paddingRight: rightMargin,
    paddingTop: topMargin,
    paddingBottom: bottomMargin,
    textIndent: indent > 0 ? indent : undefined,
    caretColor: cursorVisible ? undefined : "transparent",
    resize: "none",
    ...style,
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChanged?.(e.target.value);
      onChange?.(e);
    },
    [onChanged, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab" && !acceptsTab) {
        // Allow default tab behavior (focus change)
      } else if (e.key === "Tab" && acceptsTab) {
        e.preventDefault();
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        target.value = target.value.substring(0, start) + "\t" + target.value.substring(end);
        target.selectionStart = target.selectionEnd = start + 1;
        onChanged?.(target.value);
      }
      onKeyDown?.(e);
    },
    [acceptsTab, onChanged, onKeyDown],
  );

  return (
    <textarea
      ref={ref}
      className={classes.join(" ")}
      readOnly={!editable}
      wrap={cssWrap}
      style={cssStyle}
      disabled={disabled}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-disabled={disabled || undefined}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
});
