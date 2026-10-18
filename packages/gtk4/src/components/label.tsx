import { forwardRef, type HTMLAttributes } from "react";
import { MnemonicText } from "../mnemonic.tsx";
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
  /**
   * Whether an underscore marks the next character as the mnemonic ("_Save"),
   * underlined while Alt is held; Alt with it activates the widget the label
   * is in. `__` is a literal underscore. Default: false.
   */
  useUnderline?: boolean;
  /** Ellipsize mode. Default: "none". */
  ellipsize?: GtkEllipsizeMode;
  /** Minimum width in characters. Default: -1 (natural). */
  widthChars?: number;
  /** Maximum width in characters. Default: -1 (natural). */
  maxWidthChars?: number;
  /** The number of lines a wrapping, ellipsized label is limited to. Default: -1 (one line per paragraph). */
  lines?: number;
  /** Horizontal alignment 0.0 (left) to 1.0 (right). Default: 0.5. */
  xalign?: number;
  /** Vertical alignment 0.0 (top) to 1.0 (bottom). Default: 0.5. */
  yalign?: number;
}

/**
 * The text style of a label that wraps (GtkLabel:wrap). Pango keeps every
 * space and line break ("pre-wrap"). With "word-char" or "char" wrapping, a
 * word too long for a line breaks between characters, so the label's minimum
 * width is a character or so rather than its longest word (gtk_label_measure()).
 * `anywhere` counts those breaks in min-content, unlike `break-word`: a long
 * path shrinks with its box instead of overflowing it.
 */
export function wrapStyle(mode: GtkWrapMode = "word"): React.CSSProperties {
  return { whiteSpace: "pre-wrap", overflowWrap: mode === "word" ? "normal" : "anywhere" };
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
    useUnderline = false,
    ellipsize = "none",
    widthChars = -1,
    maxWidthChars = -1,
    lines = -1,
    xalign = 0.5,
    yalign = 0.5,
    halign,
    valign,
    hexpand,
    vexpand,
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
    // xalign and yalign place the text in a label bigger than it
    // (gtk_label_get_layout_location()). Flex start and end follow the text
    // direction, as GTK flips xalign in RTL.
    justifyContent: flexAlign(xalign),
    ...(yalign !== 0.5 && { alignItems: flexAlign(yalign) }),
    ...style,
  };

  // Pango keeps every space and line break of the text: "pre" rather than the
  // collapsing "nowrap".
  if (!wrap) cssStyle.whiteSpace = "pre";
  else Object.assign(cssStyle, wrapStyle(wrapMode));

  // `lines` only limits a wrapping, ellipsizing label, which wraps up to that
  // many lines. Otherwise an ellipsized paragraph is one line (Pango's default
  // layout height of -1).
  const lineLimit = wrap && ellipsize !== "none" && lines > 0;
  // The label is a flex container (so it can center its text vertically) and
  // text-overflow doesn't apply to flex containers: an ellipsizing label puts
  // its text in a block that can shrink and draw the ellipsis. Its minimum
  // width isn't the text's (gtk_label_measure()), so whatever it's in can
  // shrink it: the label is a grid whose track goes from nothing up to the
  // text instead.
  const ellipsizing = ellipsize !== "none" && !lineLimit;
  if (ellipsizing) {
    cssStyle.overflow = "hidden";
    cssStyle.whiteSpace = "pre";
    cssStyle.display = "inline-grid";
    cssStyle.gridTemplateColumns = "minmax(0, max-content)";
  }

  if (widthChars > 0) {
    cssStyle.minWidth = `${widthChars}ch`;
  }
  if (maxWidthChars > 0) {
    cssStyle.maxWidth = `${maxWidthChars}ch`;
  }
  if (lineLimit) {
    // The clamp draws the ellipsis at the end of its last line.
    cssStyle.display = "-webkit-box";
    cssStyle.WebkitLineClamp = lines;
    cssStyle.WebkitBoxOrient = "vertical";
    cssStyle.overflow = "hidden";
  }

  const content = useUnderline ? <MnemonicText text={text} /> : text;

  return (
    <span
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={cssStyle}
      {...rest}
    >
      {ellipsizing ? <span style={ELLIPSIS_STYLE}>{content}</span> : content}
    </span>
  );
});

/** A GTK alignment (0 start, 0.5 center, 1 end) as a flex one; others take the nearest. */
function flexAlign(align: number): "flex-start" | "center" | "flex-end" {
  return align < 0.25 ? "flex-start" : align > 0.75 ? "flex-end" : "center";
}

const ELLIPSIS_STYLE: React.CSSProperties = {
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "pre",
};
