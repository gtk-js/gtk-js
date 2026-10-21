/**
 * Line breaking for GTK_WRAP_CHAR and GTK_WRAP_WORD_CHAR as Pango does it
 * (process_item() in pango-layout.c): each row takes as much of the paragraph
 * as fits, breaking at the last place it may, and where that's inside a word
 * Pango draws a hyphen at the row's end (PANGO_ATTR_INSERT_HYPHENS, on by
 * default in a GtkTextView) and leaves room for it. Browsers break words
 * without hyphens, so the text view lays these rows out itself.
 */

/** A row of a paragraph: its text from `start` to `end`, and whether a hyphen ends it. */
export interface WrapRow {
  start: number;
  end: number;
  hyphen: boolean;
}

/** Where a paragraph may break, and how, as Pango's log attributes have it (default_break()). */
export interface BreakAttrs {
  /** A row may start before this character (is_char_break: a grapheme boundary). */
  charBreak: boolean[];
  /** A row may start before this character in word wrapping (is_line_break). */
  lineBreak: boolean[];
  /** Breaking before this character draws a hyphen (break_inserts_hyphen). */
  hyphen: boolean[];
  /** The character is white space (is_white, g_unichar_isspace()). */
  white: boolean[];
}

const SPACE = /^[\t\n\v\f\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]$/u;
// Hyphen-like characters after or before which Pango inserts no hyphen.
const HYPHENS = new Set([
  0x2d, 0x58a, 0x1400, 0x1806, 0x2010, 0x2027, 0x2e17, 0x2e40, 0x30a0, 0xfe63, 0xff0d,
]);
const NO_HYPHEN_SCRIPT = /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const COMMON_SCRIPT = /\p{Script=Common}/u;
// Ideographic text breaks between any two characters (UAX #14 ID).
const IDEOGRAPHIC = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

type Segmenter = typeof Intl.Segmenter;

function segmentStarts(text: string, granularity: "grapheme" | "word"): Set<number> {
  const starts = new Set<number>();
  const Segmenter = (Intl as { Segmenter?: Segmenter }).Segmenter;
  if (!Segmenter) {
    for (let i = 0; i < text.length; i++) starts.add(i);
    return starts;
  }
  for (const segment of new Segmenter(undefined, { granularity }).segment(text)) {
    starts.add(segment.index);
  }
  return starts;
}

/** Whether Pango counts the character as a space or a hyphen (no hyphen next to it). */
function spaceOrHyphen(char: string): boolean {
  if (SPACE.test(char)) return true;
  return HYPHENS.has(char.codePointAt(0)!);
}

/**
 * A paragraph's break attributes. Hyphens follow default_break(): a break
 * inside a word (not at a word boundary), not next to a space or a hyphen,
 * after a character of a script Pango hyphenates (not Han, Hangul, Hiragana or
 * Katakana, and of the Common script, digits and punctuation, only a soft
 * hyphen). Word wrapping's breaks are UAX #14's for the common cases: after
 * spaces, after a hyphen before a letter or digit, and around ideographs.
 */
export function breakAttrs(text: string): BreakAttrs {
  const length = text.length;
  const graphemes = segmentStarts(text, "grapheme");
  const words = segmentStarts(text, "word");
  const charBreak: boolean[] = [];
  const lineBreak: boolean[] = [];
  const hyphen: boolean[] = [];
  const white: boolean[] = [];
  for (let i = 0; i <= length; i++) {
    const char = text[i] ?? "";
    const prev = text[i - 1] ?? "";
    white[i] = i < length && SPACE.test(char);
    const boundary = i === 0 || i === length || graphemes.has(i);
    charBreak[i] = i > 0 && boundary;
    if (i === 0 || i === length || !boundary) {
      lineBreak[i] = i === length;
      hyphen[i] = false;
      continue;
    }
    lineBreak[i] =
      (SPACE.test(prev) && !SPACE.test(char)) ||
      (HYPHENS.has(prev.codePointAt(0)!) && /[\p{L}\p{N}]/u.test(char)) ||
      ((IDEOGRAPHIC.test(prev) || IDEOGRAPHIC.test(char)) && !SPACE.test(char));
    const prevChar = String.fromCodePoint(text.codePointAt(i - 1)!);
    const insert = COMMON_SCRIPT.test(prevChar)
      ? prev === "\u00ad"
      : !NO_HYPHEN_SCRIPT.test(prevChar);
    hyphen[i] =
      prev === "\u2027" ||
      (!words.has(i) && !spaceOrHyphen(prev) && !spaceOrHyphen(char) && insert);
  }
  return { charBreak, lineBreak, hyphen, white };
}

/**
 * A paragraph's rows at a width. `advances` are its characters' widths as
 * Pango has them (tabs' are taken from the tab stops), `tabStop` the tab
 * stops' spacing, `hyphenWidth` the hyphen's; the first row's width is
 * `firstWidth` (the paragraph's indent's taken off).
 */
export function wrapParagraph(
  text: string,
  attrs: BreakAttrs,
  advances: readonly number[],
  mode: "char" | "word-char",
  width: number,
  tabStop: number,
  hyphenWidth: number,
  firstWidth = width,
): WrapRow[] {
  const length = text.length;
  const rows: WrapRow[] = [];
  let start = 0;
  while (start < length) {
    const room = start === 0 ? firstWidth : width;
    const fit = (breaks: boolean[]) => {
      // The last break that fits; a tab always fits, taking up to the width
      // (process_item()).
      let x = 0;
      let best = -1;
      let first = -1;
      for (let i = start; i < length; i++) {
        if (text[i] === "\t") {
          const advance = tabStop > 0 ? (Math.floor(x / tabStop) + 1) * tabStop - x : 0;
          x = Math.min(x + advance, room);
        } else {
          x += advances[i] ?? 0;
        }
        const at = i + 1;
        if (at < length && !breaks[at]) continue;
        if (first < 0) first = at;
        if (at === length) {
          if (x <= room + 1e-6) best = at;
          break;
        }
        // Breaking inside a word takes the hyphen's width; after a space, its
        // own isn't counted (find_break_extra_width()).
        const extra = attrs.hyphen[at]
          ? hyphenWidth
          : attrs.white[at - 1]
            ? -(text[at - 1] === "\t" ? 0 : (advances[at - 1] ?? 0))
            : 0;
        if (x + extra <= room + 1e-6) best = at;
        else if (Math.min(x, x + extra) > room) break;
      }
      return { best, first };
    };
    let { best, first } = fit(mode === "char" ? attrs.charBreak : attrs.lineBreak);
    // Word-char wrapping breaks a word only when it fills a row by itself.
    if (mode === "word-char" && best < 0) ({ best, first } = fit(attrs.charBreak));
    // A row takes at least one character.
    const end = best > start ? best : first > start ? first : length;
    rows.push({ start, end, hyphen: end < length && attrs.hyphen[end] === true });
    start = end;
  }
  if (!rows.length) rows.push({ start: 0, end: 0, hyphen: false });
  return rows;
}
