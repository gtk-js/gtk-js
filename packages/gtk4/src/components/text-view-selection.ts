/** A rectangle the selection fills, in the text window's coordinates. */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

let readsSelectionStyle: boolean | undefined;

/**
 * Whether the browser gives the styles of ::selection (getComputedStyle()), so
 * the text view can draw its selection in the colors the theme gives it.
 */
export function canReadSelectionStyle(): boolean {
  if (readsSelectionStyle !== undefined) return readsSelectionStyle;
  if (typeof document === "undefined" || !document.body) return false;
  const style = document.createElement("style");
  style.textContent = "#gtk-js-selection-probe::selection { background-color: rgb(1, 2, 3) }";
  const probe = document.createElement("span");
  probe.id = "gtk-js-selection-probe";
  document.head.append(style);
  document.body.append(probe);
  readsSelectionStyle = getComputedStyle(probe, "::selection").backgroundColor === "rgb(1, 2, 3)";
  style.remove();
  probe.remove();
  return readsSelectionStyle;
}

/**
 * The selection's color for the text node as it is (focused or not): the
 * theme's and the app's ::selection rules, which reset.css overrides while
 * the text view draws the selection itself.
 */
export function selectionColor(text: HTMLTextAreaElement): string {
  text.setAttribute("data-gtk-probe", "");
  const color = getComputedStyle(text, "::selection").backgroundColor;
  text.removeAttribute("data-gtk-probe");
  return color;
}

/**
 * The rectangles GTK fills for a selection, as render_para() does on each
 * display line: the selected text's x ranges, the line's whole height; from
 * the left margin to the text where the selection began on an earlier line;
 * and from the end of the text to the right margin where it goes on past the
 * line (the newline is selected, or the line wraps). That fill ends as
 * render_para() ends it: at the screen width (the text window's less a pixel
 * for the cursor) or the widest line, whichever is wider, less the right
 * margin (total_width in set_para_values()).
 *
 * `paragraphs` holds one element per paragraph, laid out like the text, each
 * with the paragraph's text and a newline as its one text node; `layer` is
 * the element the rectangles are drawn in.
 */
export function selectionRects(
  paragraphs: HTMLElement,
  layer: HTMLElement,
  start: number,
  end: number,
  leftMargin: number,
  rightMargin: number,
  lineHeight: number,
): SelectionRect[] {
  const rects: SelectionRect[] = [];
  if (start >= end || lineHeight <= 0) return rects;
  const origin = layer.getBoundingClientRect();
  const range = document.createRange();
  const elements = paragraphs.children;
  // Where a fill past the text ends: the text window's width less the space
  // GTK keeps for the cursor (SPACE_FOR_CURSOR), or the widest line with its
  // margins where that is wider; less the right margin.
  let widest = 0;
  for (const element of elements) {
    const node = element.firstChild;
    if (!node?.textContent || node.textContent.length < 2) continue;
    range.setStart(node, 0);
    range.setEnd(node, node.textContent.length - 1);
    widest = Math.max(widest, Math.round(range.getBoundingClientRect().right - origin.left));
  }
  const width = Math.max(layer.clientWidth - 1, widest + rightMargin) - rightMargin;
  let paragraphStart = 0;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as HTMLElement;
    const node = element.firstChild;
    const length = (node?.textContent?.length ?? 1) - 1;
    const paragraphEnd = paragraphStart + length;
    const hasNewline = i < elements.length - 1;
    const intersects = start <= paragraphEnd && end > paragraphStart;
    if (intersects && node && start < paragraphEnd + (hasNewline ? 1 : 0)) {
      const from = Math.max(start, paragraphStart) - paragraphStart;
      const to = Math.min(end, paragraphEnd) - paragraphStart;
      const newline = hasNewline && end > paragraphEnd;
      const top = element.getBoundingClientRect().top - origin.top;
      const rowOf = (rect: DOMRect) =>
        Math.max(0, Math.floor((rect.top + rect.height / 2 - origin.top - top) / lineHeight));

      // Each display line's selected x range.
      const rows = new Map<number, { left: number; right: number }>();
      const add = (rect: DOMRect) => {
        const row = rowOf(rect);
        const left = rect.left - origin.left;
        const right = rect.right - origin.left;
        const seen = rows.get(row);
        if (seen) {
          seen.left = Math.min(seen.left, left);
          seen.right = Math.max(seen.right, right);
        } else {
          rows.set(row, { left, right });
        }
      };
      if (from < to) {
        range.setStart(node, from);
        range.setEnd(node, to);
        const clientRects = [...range.getClientRects()];
        const wide = clientRects.filter((rect) => rect.width > 0);
        for (const rect of wide.length ? wide : clientRects) add(rect);
      } else {
        // Just the newline: where the paragraph's text ends.
        range.setStart(node, length);
        range.setEnd(node, length);
        add(range.getBoundingClientRect());
      }

      const ordered = [...rows.keys()].sort((a, b) => a - b);
      const lastRow = ordered[ordered.length - 1];
      for (const row of ordered) {
        const { left, right } = rows.get(row)!;
        const y = top + row * lineHeight;
        const x0 = Math.round(left);
        const x1 = Math.round(right);
        if (x1 > x0) rects.push({ x: x0, y, width: x1 - x0, height: lineHeight });
        // The selection began on an earlier display line.
        const beganBefore = row !== ordered[0] || start < paragraphStart;
        if (beganBefore && x0 > leftMargin) {
          rects.push({ x: leftMargin, y, width: x0 - leftMargin, height: lineHeight });
        }
        // It goes on past this display line.
        if ((row !== lastRow || newline) && x1 < width) {
          rects.push({ x: x1, y, width: width - x1, height: lineHeight });
        }
      }
    }
    paragraphStart = paragraphEnd + 1;
    if (paragraphStart > end) break;
  }
  return rects;
}
