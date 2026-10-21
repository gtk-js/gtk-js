import { cursorRange, rowRange } from "./text-view-metrics.ts";

/**
 * Where a GtkTextView's text is: each paragraph's box in the text window
 * (gtk_text_layout_get_line_yrange()), and the height of its rows. Gutters and
 * the layers under the text are drawn from it.
 */
export interface GtkTextViewLayout {
  /** Each paragraph's top and height, from the text window's top (margins included). */
  paragraphs: readonly { top: number; height: number }[];
  /** A row's height, unrounded: a paragraph is its rows' height to the nearest pixel. */
  rowHeight: number;
}

/** A rectangle the selection fills, in the text window's coordinates. */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The cursor's rectangle, in the text window's coordinates. */
export interface CursorRect {
  x: number;
  y: number;
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
 * The text node's colors as the theme and the app give them, which reset.css
 * overrides on the <textarea> while the view draws its text itself: the
 * selection's (`text selection`, focused or not) and the cursor's.
 */
export function textColors(text: HTMLTextAreaElement): { selection: string; cursor: string } {
  text.setAttribute("data-gtk-probe", "");
  const css = getComputedStyle(text);
  const selection = canReadSelectionStyle()
    ? getComputedStyle(text, "::selection").backgroundColor
    : "Highlight";
  const caret = css.caretColor;
  const cursor = !caret || caret === "auto" ? css.color : caret;
  text.removeAttribute("data-gtk-probe");
  return { selection, cursor };
}

/** The offset each paragraph of the text starts at. */
export function paragraphStarts(text: string): number[] {
  const starts = [0];
  for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

/** The paragraph an offset is in. */
function paragraphAt(starts: readonly number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid]! <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * A paragraph's text as the view draws it: its element holds a block of rows,
 * each a text node (one row the browser may wrap, or the rows the view broke
 * it into, text-view-wrap.ts), the last ending in the paragraph's newline.
 */
interface ParagraphText {
  nodes: Text[];
  /** Each node's offset in the paragraph. */
  starts: number[];
  /** The paragraph's length, without its newline. */
  length: number;
}

function paragraphText(paragraph: Element): ParagraphText | null {
  const block = paragraph.firstElementChild;
  if (!block) return null;
  const nodes: Text[] = [];
  const starts: number[] = [];
  let length = 0;
  for (const row of block.children) {
    const node = row.firstChild;
    if (!(node instanceof Text)) continue;
    nodes.push(node);
    starts.push(length);
    length += node.length;
  }
  return nodes.length ? { nodes, starts, length: length - 1 } : null;
}

/** The text node and its offset for a paragraph offset (a row's start, not the row before's end). */
function locate(text: ParagraphText, offset: number): [Text, number] {
  for (let i = text.nodes.length - 1; i >= 0; i--) {
    if (offset >= text.starts[i]!) {
      const node = text.nodes[i]!;
      return [node, Math.min(offset - text.starts[i]!, node.length)];
    }
  }
  return [text.nodes[0]!, 0];
}

/** A range over a paragraph's offsets. */
function rangeOf(text: ParagraphText, from: number, to: number): Range {
  const range = document.createRange();
  range.setStart(...locate(text, from));
  range.setEnd(...locate(text, to));
  return range;
}

/** The paragraph offset of a point in one of its text nodes. */
function offsetIn(text: ParagraphText, node: Node, offset: number): number | null {
  const index = text.nodes.indexOf(node as Text);
  if (index < 0) return null;
  const last = index === text.nodes.length - 1;
  return Math.min(text.starts[index]! + offset, last ? text.length : text.starts[index + 1]!);
}

/** The number of rows each paragraph takes, as laid out at the row height. */
export function paragraphRows(container: HTMLElement, rowHeight: number): number[] {
  return Array.from(container.children, (paragraph) => {
    const block = paragraph.firstElementChild;
    const height = block ? block.getBoundingClientRect().height : rowHeight;
    return Math.max(1, Math.round(height / rowHeight));
  });
}

/**
 * Where Pango has a point of a paragraph's text the browser lays out at
 * client x: browsers lay text out at their own font size (Chromium at
 * 1/64px, 14.65625px for 11pt), so the text's widths are scaled to the
 * specified size's from the paragraph's start (textScale()).
 */
function pangoX(clientX: number, paragraph: Element, scale: number): number {
  if (scale === 1) return clientX;
  const block = paragraph.firstElementChild ?? paragraph;
  const start = (block.firstElementChild ?? block).getBoundingClientRect().left;
  return start + (clientX - start) * scale;
}

/**
 * How much wider Pango lays text out than the browser does: a canvas's width
 * of text at a size where its rounding doesn't show, over the probe's (the
 * same text in the font, laid out by the browser at its size).
 */
export function textScale(probe: HTMLElement): number {
  if (typeof CanvasRenderingContext2D === "undefined") return 1;
  const css = getComputedStyle(probe);
  const size = Number.parseFloat(css.fontSize);
  const width = probe.getBoundingClientRect().width;
  const context = document.createElement("canvas").getContext("2d");
  if (!context || !size || !width) return 1;
  context.font = `${css.fontStyle} ${css.fontWeight} 1000px ${css.fontFamily}`;
  const scale = (context.measureText(probe.textContent ?? "").width * size) / 1000 / width;
  return Number.isFinite(scale) && Math.abs(scale - 1) < 0.01 ? scale : 1;
}

/** The row of a paragraph a client rectangle is on. */
function rowOf(rect: DOMRect, top: number, rowHeight: number): number {
  return Math.max(0, Math.floor((rect.top + rect.height / 2 - top) / rowHeight));
}

/**
 * The rectangles GTK fills for a selection, as render_para() does on each
 * display line: the selected text's x ranges (with the hyphen a row's last
 * character carries, its cluster's), the row's whole height (from its top to
 * the next's, each rounded to the pixel); from the left margin to the text
 * where the selection began on an earlier row; and from the end of the text
 * where it goes on past the row (the newline is selected, or the row wraps).
 * That fill ends at the screen width (the text window's less a pixel for the
 * cursor) or the widest line, whichever is wider, less the right margin
 * (total_width in set_para_values()).
 */
export function selectionRects(
  container: HTMLElement,
  layer: HTMLElement,
  starts: readonly number[],
  start: number,
  end: number,
  leftMargin: number,
  rightMargin: number,
  rowHeight: number,
  scale = 1,
  hyphenWidth = 0,
  wrap: "none" | "word" | "char" = "none",
): SelectionRect[] {
  const rects: SelectionRect[] = [];
  if (start >= end || rowHeight <= 0) return rects;
  const origin = layer.getBoundingClientRect();
  const paragraphs = container.children;
  // The widest line: unwrapped, the longest; word-wrapped, a word too long for
  // its row (the spaces a row ends with hang, uncounted); character-wrapped
  // rows don't run past the width.
  let widest = 0;
  for (const paragraph of paragraphs) {
    const text = paragraphText(paragraph);
    const block = paragraph.firstElementChild;
    if (!text || !block || text.length < 1 || wrap === "char") continue;
    const right =
      wrap === "word"
        ? block.getBoundingClientRect().left + block.scrollWidth
        : rangeOf(text, 0, text.length).getBoundingClientRect().right;
    widest = Math.max(widest, Math.round(pangoX(right, paragraph, scale) - origin.left));
  }
  const width = Math.max(layer.clientWidth - 1, widest + rightMargin) - rightMargin;

  for (let i = paragraphAt(starts, start); i < paragraphs.length; i++) {
    const paragraphStart = starts[i]!;
    if (paragraphStart >= end) break;
    const element = paragraphs[i]!;
    const text = paragraphText(element);
    if (!text) continue;
    const length = text.length;
    const paragraphEnd = paragraphStart + length;
    const hasNewline = i < paragraphs.length - 1;
    if (start >= paragraphEnd + (hasNewline ? 1 : 0)) continue;
    const from = Math.max(start, paragraphStart) - paragraphStart;
    const to = Math.min(end, paragraphEnd) - paragraphStart;
    const newline = hasNewline && end > paragraphEnd;
    const clientTop = element.getBoundingClientRect().top;
    const top = clientTop - origin.top;

    // Each display line's selected x range.
    const rows = new Map<number, { left: number; right: number }>();
    const add = (rect: DOMRect) => {
      const row = rowOf(rect, clientTop, rowHeight);
      const left = pangoX(rect.left, element, scale) - origin.left;
      const right = pangoX(rect.right, element, scale) - origin.left;
      const seen = rows.get(row);
      if (seen) {
        seen.left = Math.min(seen.left, left);
        seen.right = Math.max(seen.right, right);
      } else {
        rows.set(row, { left, right });
      }
    };
    if (from < to) {
      const clientRects = [...rangeOf(text, from, to).getClientRects()];
      const wide = clientRects.filter((rect) => rect.width > 0);
      for (const rect of wide.length ? wide : clientRects) add(rect);
      // A row the view broke with a hyphen: its last character's cluster
      // takes the hyphen too.
      text.nodes.forEach((node, n) => {
        const rowEnd = text.starts[n]! + node.length;
        const row = node.parentElement;
        if (!row?.hasAttribute("data-hyphen") || from >= rowEnd || to < rowEnd) return;
        const last = rangeOf(text, rowEnd - 1, rowEnd).getClientRects()[0];
        const seen = last && rows.get(rowOf(last, clientTop, rowHeight));
        if (seen) seen.right += hyphenWidth;
      });
    } else {
      // Just the newline: where the paragraph's text ends.
      const found = characterRect(text, length);
      if (found) {
        const x =
          pangoX(found.after ? found.rect.right : found.rect.left, element, scale) - origin.left;
        rows.set(rowOf(found.rect, clientTop, rowHeight), { left: x, right: x });
      }
    }

    const ordered = [...rows.keys()].sort((a, b) => a - b);
    const lastRow = ordered[ordered.length - 1];
    for (const row of ordered) {
      const { left, right } = rows.get(row)!;
      const [y0, y1] = rowRange(row, rowHeight);
      const y = top + y0;
      const height = y1 - y0;
      // A space a row breaks after hangs, zero wide (zero_line_final_glyph()).
      const x0 = Math.min(Math.round(left), width);
      const x1 = Math.min(Math.round(right), width);
      if (x1 > x0) rects.push({ x: x0, y, width: x1 - x0, height });
      // The selection began on an earlier display line.
      const beganBefore = row !== ordered[0] || start < paragraphStart;
      if (beganBefore && x0 > leftMargin) {
        rects.push({ x: leftMargin, y, width: x0 - leftMargin, height });
      }
      // It goes on past this display line.
      if ((row !== lastRow || newline) && x1 < width) {
        rects.push({ x: x1, y, width: width - x1, height });
      }
    }
  }
  return rects;
}

/**
 * The client rectangle of the character after a paragraph offset (a row's
 * first at a row's start, the newline at the end), or, at the end of a
 * paragraph with text, of the one before it.
 */
function characterRect(
  text: ParagraphText,
  offset: number,
): { rect: DOMRect; after: boolean } | null {
  if (offset < text.length || text.length === 0) {
    const rect = rangeOf(text, offset, offset + 1).getClientRects()[0];
    if (rect && rect.height > 0) return { rect, after: false };
  }
  if (text.length > 0) {
    const rects = rangeOf(text, Math.max(0, offset - 1), Math.max(1, offset)).getClientRects();
    const rect = rects[rects.length - 1];
    if (rect) return { rect, after: true };
  }
  const rect = rangeOf(text, 0, 0).getBoundingClientRect();
  return rect.height > 0 ? { rect, after: false } : null;
}

/**
 * The cursor's rectangle at an offset: its row of the paragraph rounded out
 * to whole pixels and its x to the pixel, as gtk_css_style_snapshot_caret()
 * draws it from pango_layout_get_caret_pos(). At a row's break it's at the
 * next row's start.
 */
export function cursorRect(
  container: HTMLElement,
  layer: HTMLElement,
  starts: readonly number[],
  offset: number,
  rowHeight: number,
  scale = 1,
): CursorRect | null {
  const index = paragraphAt(starts, offset);
  const element = container.children[index];
  const text = element && paragraphText(element);
  if (!text || rowHeight <= 0) return null;
  const local = Math.min(offset - starts[index]!, text.length);
  const found = characterRect(text, local);
  const origin = layer.getBoundingClientRect();
  const top = element.getBoundingClientRect().top;
  if (!found) {
    const block = element.firstElementChild!.getBoundingClientRect();
    const [y0, y1] = cursorRange(0, rowHeight);
    return { x: Math.floor(block.left - origin.left), y: top - origin.top + y0, height: y1 - y0 };
  }
  const row = rowOf(found.rect, top, rowHeight);
  const [y0, y1] = cursorRange(row, rowHeight);
  const x = pangoX(found.after ? found.rect.right : found.rect.left, element, scale) - origin.left;
  return { x: Math.floor(x + 1e-3), y: top - origin.top + y0, height: y1 - y0 };
}

/** The offset nearest a point in the text (gtk_text_layout_get_iter_at_pixel()). */
export function offsetAtPoint(
  container: HTMLElement,
  starts: readonly number[],
  clientX: number,
  clientY: number,
): number | null {
  const paragraphs = container.children;
  if (!paragraphs.length) return null;
  // The paragraph the point is level with, or the nearest.
  let index = paragraphs.length - 1;
  for (let i = 0; i < paragraphs.length; i++) {
    if (clientY < paragraphs[i]!.getBoundingClientRect().bottom) {
      index = i;
      break;
    }
  }
  const block = paragraphs[index]!.firstElementChild;
  const text = paragraphText(paragraphs[index]!);
  if (!block || !text) return null;
  const box = block.getBoundingClientRect();
  const y = Math.min(Math.max(clientY, box.top + 0.5), box.bottom - 0.5);
  const area = container.getBoundingClientRect();
  const x = Math.min(Math.max(clientX, area.left), area.right - 1);

  const doc = container.ownerDocument as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let hitNode: Node | null = null;
  let hitOffset = 0;
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    hitNode = position?.offsetNode ?? null;
    hitOffset = position?.offset ?? 0;
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    hitNode = range?.startContainer ?? null;
    hitOffset = range?.startOffset ?? 0;
  }
  // A row's element (its hyphen) is past its text.
  if (hitNode && !(hitNode instanceof Text) && hitNode.parentNode === block) {
    hitNode = hitNode.firstChild;
    hitOffset = hitNode instanceof Text ? hitNode.length : 0;
  }
  const local =
    (hitNode && offsetIn(text, hitNode, hitOffset)) ??
    (x < box.left + box.width / 2 ? 0 : text.length);
  return starts[index]! + local;
}

/** The words of a paragraph (Unicode word boundaries, as Pango finds them). */
function wordsOf(paragraph: string): [number, number][] {
  const words: [number, number][] = [];
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) {
    for (const segment of new Segmenter(undefined, { granularity: "word" }).segment(paragraph)) {
      if (segment.isWordLike) words.push([segment.index, segment.index + segment.segment.length]);
    }
  } else {
    for (const match of paragraph.matchAll(/[\p{L}\p{N}_]+/gu)) {
      words.push([match.index!, match.index! + match[0].length]);
    }
  }
  return words;
}

/**
 * What a double click selects at an offset (gtk_text_view_extend_selection()
 * with GTK_TEXT_EXTEND_SELECTION_WORD): the word it's inside, or else the
 * space between the words around it on its line.
 */
export function wordRange(text: string, offset: number): [number, number] {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  const newline = text.indexOf("\n", offset);
  const lineEnd = newline < 0 ? text.length : newline;
  const local = offset - lineStart;
  const words = wordsOf(text.slice(lineStart, lineEnd));
  const inside = words.find(([start, end]) => start <= local && local < end);
  if (inside) return [lineStart + inside[0], lineStart + inside[1]];
  const before = words.filter(([, end]) => end <= local).pop();
  const after = words.find(([start]) => start >= local);
  return [lineStart + (before ? before[1] : 0), lineStart + (after ? after[0] : local)];
}

/**
 * The display line an offset is on: from its start to the next one's, or to
 * the paragraph's end.
 */
export function displayLine(
  container: HTMLElement,
  starts: readonly number[],
  offset: number,
  rowHeight: number,
): { start: number; end: number; last: boolean; paragraph: number } | null {
  const index = paragraphAt(starts, offset);
  const paragraphStart = starts[index]!;
  const element = container.children[index];
  const text = element && paragraphText(element);
  if (!text) return null;
  const length = text.length;
  if (length === 0)
    return { start: paragraphStart, end: paragraphStart, last: true, paragraph: index };
  // The rows' starts, from where the characters are laid out.
  const top = element.getBoundingClientRect().top;
  const rowAt = (local: number) => {
    const rect = rangeOf(text, local, local + 1).getClientRects()[0];
    return rect ? rowOf(rect, top, rowHeight) : 0;
  };
  const local = Math.min(offset - paragraphStart, length - 1);
  const row = rowAt(local);
  let start = local;
  while (start > 0 && rowAt(start - 1) === row) start--;
  let end = local;
  while (end < length && rowAt(end) === row) end++;
  return {
    start: paragraphStart + start,
    end: paragraphStart + end,
    last: end === length,
    paragraph: index,
  };
}

/**
 * What a triple click selects at an offset (GTK_TEXT_EXTEND_SELECTION_LINE):
 * its display line, to the start of the next one, the newline for a
 * paragraph's last.
 */
export function displayLineRange(
  container: HTMLElement,
  starts: readonly number[],
  text: string,
  offset: number,
  rowHeight: number,
): [number, number] {
  const line = displayLine(container, starts, offset, rowHeight);
  if (!line) return [offset, offset];
  const newline = text.indexOf("\n", line.start);
  return [line.start, line.last ? (newline < 0 ? text.length : newline + 1) : line.end];
}
