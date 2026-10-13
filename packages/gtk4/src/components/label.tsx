import { forwardRef, type HTMLAttributes } from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkEllipsizeMode,
  type GtkJustification,
  type GtkWrapMode,
} from "../types.ts";

export interface GtkLabelProps extends HTMLAttributes<HTMLSpanElement>, GtkAlignProps {
  /** Text content. */
  label: string;
  /** Text justification. Default: "left". */
  justify?: GtkJustification;
  /** Whether to wrap text. Default: false. */
  wrap?: boolean;
  /** How to wrap. Default: "word". */
  wrapMode?: GtkWrapMode;
  /** Whether the text is selectable. Default: false. */
  selectable?: boolean;
  /** Ellipsize mode. Default: "none". */
  ellipsize?: GtkEllipsizeMode;
  /** Minimum width in characters. Default: -1 (natural). */
  widthChars?: number;
  /** Maximum width in characters. Default: -1 (natural). */
  maxWidthChars?: number;
  /** Maximum number of lines. Default: -1 (unlimited). */
  lines?: number;
  /** Horizontal alignment 0.0 (left) to 1.0 (right). Default: 0.5. */
  xalign?: number;
  /** Vertical alignment 0.0 (top) to 1.0 (bottom). Default: 0.5. */
  yalign?: number;
}

/**
 * GtkLabel — A widget that displays text.
 *
 * CSS node:
 *   label
 *
 * @see https://docs.gtk.org/gtk4/class.Label.html
 */
export const GtkLabel = forwardRef<HTMLSpanElement, GtkLabelProps>(function GtkLabel(
  {
    label: text,
    justify = "left",
    wrap = false,
    wrapMode = "word",
    selectable = false,
    ellipsize = "none",
    widthChars = -1,
    maxWidthChars = -1,
    lines = -1,
    xalign = 0.5,
    yalign = 0.5,
    halign,
    valign,
    className,
    style,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-label"];
  if (className) classes.push(className);

  const textAlign =
    justify === "left"
      ? "start"
      : justify === "right"
        ? "end"
        : justify === "fill"
          ? "justify"
          : justify;

  const cssStyle: React.CSSProperties = {
    textAlign,
    userSelect: selectable ? "text" : "none",
    ...style,
  };

  if (!wrap) {
    cssStyle.whiteSpace = "nowrap";
  } else {
    cssStyle.overflowWrap =
      wrapMode === "char" ? "anywhere" : wrapMode === "word-char" ? "break-word" : "normal";
  }

  // The label is a flex container (so it can center its text vertically) and
  // text-overflow doesn't apply to flex containers: an ellipsizing label puts
  // its text in a block that can shrink and draw the ellipsis.
  const ellipsizing = ellipsize !== "none" && lines <= 0;
  if (ellipsize !== "none") {
    cssStyle.overflow = "hidden";
    cssStyle.whiteSpace = "nowrap";
    if (!ellipsizing) cssStyle.textOverflow = "ellipsis";
  }

  if (widthChars > 0) {
    cssStyle.minWidth = `${widthChars}ch`;
  }
  if (maxWidthChars > 0) {
    cssStyle.maxWidth = `${maxWidthChars}ch`;
  }
  if (lines > 0) {
    cssStyle.display = "-webkit-box";
    cssStyle.WebkitLineClamp = lines;
    cssStyle.WebkitBoxOrient = "vertical";
    cssStyle.overflow = "hidden";
  }

  return (
    <span
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign)}
      style={cssStyle}
      {...rest}
    >
      {ellipsizing ? <span style={ELLIPSIS_STYLE}>{text}</span> : text}
    </span>
  );
});

const ELLIPSIS_STYLE: React.CSSProperties = {
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
