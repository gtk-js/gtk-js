import type { GtkSourceStyleScheme } from "./style-scheme.ts";
import type { GtkSourceStyle } from "./style-scheme-data.ts";

/** RIGHT_MARGIN_LINE_ALPHA and RIGHT_MARGIN_OVERLAY_ALPHA, out of 255. */
const RIGHT_MARGIN_LINE_ALPHA = 40;
const RIGHT_MARGIN_OVERLAY_ALPHA = 15;

/**
 * The class a view with a scheme gets, which scopes the scheme's stylesheet to
 * it as GTK adds the scheme's CSS provider to the view alone
 * (_gtk_source_style_scheme_apply()).
 */
export function styleSchemeClass(scheme: GtkSourceStyleScheme): string {
  return `source-scheme-${scheme.id.replace(/[^\w-]/g, "_")}`;
}

/** premix_colors(): `fg` at `alpha` over `bg`, or `fg` at that alpha if there's no bg. */
function premix(fg: string, bg: string | undefined, alpha: number): string {
  const percent = `${+((alpha / 255) * 100).toFixed(3)}%`;
  return `color-mix(in srgb, ${fg} ${percent}, ${bg ?? "transparent"})`;
}

/** The alpha of a color written as hex or rgba()/hsla(), else 1 (a keyword). */
function alphaOf(color: string): number {
  const hex = color.match(/^#(?:[0-9a-f]{3}([0-9a-f])|[0-9a-f]{6}([0-9a-f]{2}))$/i);
  if (hex) {
    const a = hex[1] ? hex[1] + hex[1] : hex[2];
    return a ? parseInt(a, 16) / 255 : 1;
  }
  const fn = color.match(/^(?:rgba?|hsla?)\((.*)\)$/i);
  if (fn) {
    const parts = fn[1]!.split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 4) return 1;
    const a = parts[3]!;
    return a.endsWith("%") ? parseFloat(a) / 100 : parseFloat(a);
  }
  return color.toLowerCase() === "transparent" ? 0 : 1;
}

/** `color` at alpha .3, as fix_broken_selection() makes a solid selection. */
function withAlpha30(color: string): string {
  return `rgb(from ${color} r g b / 0.3)`;
}

function declarations(lines: (string | false | undefined)[]): string {
  return lines.filter(Boolean).join(" ");
}

/**
 * append_css_style(): a rule with the style's background and foreground, if it
 * has either. A selection with a solid background and no foreground gets a
 * translucent one (fix_broken_selection()); a selection's transparent
 * foreground leaves the text its own color, as GTK draws it
 * (gtk_text_layout_snapshot()), so it's left out.
 */
function styleRule(selector: string, style: GtkSourceStyle | null): string {
  if (!style) return "";
  let { background, foreground } = style;
  if (!background && !foreground) return "";
  const selection = selector.endsWith("::selection");
  if (selection && background && !foreground && alphaOf(background) >= 1) {
    background = withAlpha30(background);
    foreground = "rgba(0, 0, 0, 0)";
  }
  if (selection && foreground && alphaOf(foreground) === 0) foreground = undefined;
  const body = declarations([
    background && `background-color: ${background};`,
    foreground && `color: ${foreground}; --gtk-current-color: ${foreground};`,
  ]);
  return body ? `${selector} { ${body} }\n` : "";
}

/**
 * The stylesheet a scheme gives the views that use it: generate_css_style()'s
 * rules, and the colors update_style() takes from the scheme for the current
 * line, the current line's number and the right margin, as custom properties.
 *
 * GTK adds the scheme's provider at GTK_SOURCE_STYLE_PROVIDER_PRIORITY, above
 * the theme's: here the selectors are specific enough to win over the theme's.
 */
export function styleSchemeCSS(scheme: GtkSourceStyleScheme): string {
  const view = `.gtk-textview.sourceview.${styleSchemeClass(scheme)}`;
  const text = scheme.getStyle("text");
  const selection = scheme.getStyle("selection");
  const lineNumbers = scheme.getStyle("line-numbers");
  const lineNumbersBorder = scheme.getStyle("line-numbers-border");
  const cursor = scheme.getStyle("cursor")?.foreground;
  const currentLine = scheme.getStyle("current-line")?.background;
  const currentLineNumber = scheme.getStyle("current-line-number");
  const rightMargin = scheme.getStyle("right-margin");

  let css = `/* ${scheme.id} */\n`;
  css += styleRule(view, text);
  css += styleRule(`${view} > .gtk-text`, text);
  css += styleRule(`${view}:focus-within > .gtk-text::selection`, selection);
  css += styleRule(
    `${view} > .gtk-text::selection`,
    scheme.getStyle("selection-unfocused") ?? selection,
  );
  // "For now we use "line numbers" colors for all the gutters".
  css += styleRule(`${view} > .gtk-border > .gtk-gutter`, lineNumbers);
  if (lineNumbersBorder?.background) {
    css += `${view} > .gtk-border.left > .gtk-gutter { border-right: 1px solid ${lineNumbersBorder.background}; }\n`;
  }

  // update_current_line_color(): without a current-line color, the view's
  // color at 5% over the text's background. The current line's number is
  // bold unless the scheme says it isn't
  // (_gtk_source_style_scheme_get_current_line_number_bold()).
  // update_right_margin_colors(): the right-margin colors over the text's
  // background, or the view's color for the line.
  const textBackground = text?.background;
  const vars = declarations([
    // apply_css_style_cursors(): the web has one caret, the primary one.
    cursor && `caret-color: ${cursor};`,
    `--gtk-source-current-line: ${currentLine ?? premix("currentColor", textBackground, 0.05 * 255)};`,
    currentLineNumber?.foreground &&
      `--gtk-source-current-line-number-color: ${currentLineNumber.foreground};`,
    currentLineNumber?.background &&
      `--gtk-source-current-line-number-background: ${currentLineNumber.background};`,
    `--gtk-source-current-line-number-weight: ${currentLineNumber?.bold === false ? "normal" : "bold"};`,
    `--gtk-source-right-margin-line: ${premix(rightMargin?.foreground ?? "currentColor", rightMargin?.foreground ? textBackground : undefined, RIGHT_MARGIN_LINE_ALPHA)};`,
    rightMargin?.background &&
      `--gtk-source-right-margin-overlay: ${premix(rightMargin.background, textBackground, RIGHT_MARGIN_OVERLAY_ALPHA)};`,
  ]);
  css += `${view} { ${vars} }\n`;
  return css;
}

/** PANGO_SCALE_* */
const SCALES: Record<string, number> = {
  "xx-small": 1 / (1.2 * 1.2 * 1.2),
  "x-small": 1 / (1.2 * 1.2),
  small: 1 / 1.2,
  medium: 1,
  large: 1.2,
  "x-large": 1.2 * 1.2,
  "xx-large": 1.2 * 1.2 * 1.2,
};

/**
 * The CSS a style gives the text it applies to, as gtk_source_style_apply()
 * sets a GtkTextTag's properties: what syntax highlighting draws text with.
 * A line background (paragraph-background) belongs to the line, not the text.
 */
export function styleToCSS(style: GtkSourceStyle): Record<string, string> {
  const css: Record<string, string> = {};
  if (style.background) css.backgroundColor = style.background;
  if (style.foreground) css.color = style.foreground;
  if (style.italic !== undefined) css.fontStyle = style.italic ? "italic" : "normal";
  if (style.weight !== undefined) css.fontWeight = String(style.weight);
  else if (style.bold !== undefined) css.fontWeight = style.bold ? "bold" : "normal";
  const decorations: string[] = [];
  if (style.underline && style.underline !== "none") {
    decorations.push("underline");
    if (style.underline.startsWith("double")) css.textDecorationStyle = "double";
    else if (style.underline.startsWith("error")) css.textDecorationStyle = "wavy";
    if (style.underline === "low") css.textUnderlinePosition = "under";
  }
  if (style.strikethrough) decorations.push("line-through");
  if (decorations.length) css.textDecorationLine = decorations.join(" ");
  if (style.underlineColor) css.textDecorationColor = style.underlineColor;
  if (style.scale !== undefined) {
    const scale = SCALES[style.scale.toLowerCase()] ?? parseFloat(style.scale);
    if (scale > 0) css.fontSize = `${scale}em`;
  }
  return css;
}
