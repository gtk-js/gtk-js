/** The font size the metrics are read at, large enough that browsers' rounding of them doesn't show. */
const REFERENCE_SIZE = 1000;

/** Ascent + descent per pixel of font size, by font. */
const ratios = new Map<string, number>();

/**
 * The height of a line of the element's text as GtkTextView lays it out: the
 * font's ascent + descent, which Pango rounds to the nearest pixel
 * (gtk_text_layout_get_line_yrange(), PANGO_PIXELS()). Browsers give
 * `line-height: normal` from the same metrics but round them differently:
 * Firefox rounds the ascent and the descent up apiece (18px lines for DejaVu
 * Sans Mono at 11pt, where Pango's are 17px), and engines differ on the
 * fractional height, so it's read from a canvas at a size where that
 * rounding doesn't show. Null where the browser gives no font metrics.
 */
export function pangoLineHeight(element: Element): number | null {
  if (typeof CanvasRenderingContext2D === "undefined") return null;
  const css = getComputedStyle(element);
  const size = Number.parseFloat(css.fontSize);
  if (!size) return null;
  const font = `${css.fontStyle} ${css.fontWeight} ${REFERENCE_SIZE}px ${css.fontFamily}`;
  let ratio = ratios.get(font);
  if (ratio === undefined) {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return null;
    context.font = font;
    const metrics = context.measureText("");
    const height = (metrics.fontBoundingBoxAscent ?? 0) + (metrics.fontBoundingBoxDescent ?? 0);
    if (!height) return null;
    ratio = height / REFERENCE_SIZE;
    // A web font that's still loading is measured again when it has.
    if (document.fonts?.status !== "loading") ratios.set(font, ratio);
  }
  return Math.round(ratio * size);
}
