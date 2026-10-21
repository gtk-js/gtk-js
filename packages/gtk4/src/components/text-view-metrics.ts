/**
 * The font sizes the metrics are read at, largest first: large enough that
 * browsers' rounding of them doesn't show, where the canvas draws text that
 * large (Firefox's stops at 2000px).
 */
const REFERENCE_SIZES = [10000, 2000, 1000];

/** Ascent + descent per pixel of font size, by font. */
const ratios = new Map<string, number>();

/**
 * The height of a row of the element's text as Pango lays it out: the font's
 * ascent + descent, unrounded (GtkTextView doesn't hint font metrics). A
 * paragraph is its rows' height to the nearest pixel (PANGO_PIXELS() of its
 * layout's extents, gtk_text_layout_get_line_display()): one row of DejaVu
 * Sans Mono at 11pt (17.07px) is 17px, three rows of Adwaita Mono (18.33px)
 * 55px. Browsers give `line-height: normal` from the same metrics but round
 * them their own ways (Firefox rounds the ascent and the descent up apiece,
 * 18px for DejaVu Sans Mono), so they're read from a canvas at a size where
 * that rounding doesn't show. Null where the browser gives no font metrics.
 */
export function pangoRowHeight(element: Element): number | null {
  if (typeof CanvasRenderingContext2D === "undefined") return null;
  const css = getComputedStyle(element);
  const size = Number.parseFloat(css.fontSize);
  if (!size) return null;
  const font = `${css.fontStyle} ${css.fontWeight} ${css.fontFamily}`;
  let ratio = ratios.get(font);
  if (ratio === undefined) {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return null;
    const ratioAt = (reference: number) => {
      context.font = `${css.fontStyle} ${css.fontWeight} ${reference}px ${css.fontFamily}`;
      const metrics = context.measureText("");
      const height = (metrics.fontBoundingBoxAscent ?? 0) + (metrics.fontBoundingBoxDescent ?? 0);
      return height / reference;
    };
    const smallest = ratioAt(REFERENCE_SIZES[REFERENCE_SIZES.length - 1]!);
    if (!smallest) return null;
    ratio =
      REFERENCE_SIZES.map(ratioAt).find((r) => Math.abs(r - smallest) < smallest * 0.01) ??
      smallest;
    // A web font that's still loading is measured again when it has.
    if (document.fonts?.status !== "loading") ratios.set(font, ratio);
  }
  return ratio * size;
}

/**
 * The y range, in a paragraph, that GtkTextView fills for its row (the
 * selection, render_para()): from the row's top to the next row's, each
 * rounded to the pixel. The last row's end is the paragraph's height.
 */
export function rowRange(row: number, rowHeight: number): [number, number] {
  return [Math.round(row * rowHeight), Math.round((row + 1) * rowHeight)];
}

/**
 * The y range, in a paragraph, of the cursor on a row
 * (gtk_css_style_snapshot_caret(): pango_extents_to_pixels() of its
 * position, which rounds outward).
 */
export function cursorRange(row: number, rowHeight: number): [number, number] {
  return [Math.floor(row * rowHeight + 1e-6), Math.ceil((row + 1) * rowHeight - 1e-6)];
}
