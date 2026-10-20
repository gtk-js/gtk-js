/**
 * GtkSpinButton's value logic (gtkspinbutton.c), kept apart from the
 * component so it can be tested on its own.
 */

/** Values closer than this are equal (EPSILON). */
export const EPSILON = 1e-10;

/** Like GtkAdjustment, which keeps its value in [lower, upper]. */
export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * The text for a value: `%0.*f`, without the sign of a negative zero
 * (gtk_spin_button_format_for_value(), weed_out_neg_zero()).
 */
export function formatValue(value: number, digits: number): string {
  const text = value.toFixed(digits);
  return /^-0(\.0+)?$/.test(text) ? text.slice(1) : text;
}

/**
 * The width of the text in characters: the longer of the formatted bounds, at
 * most 10 (gtk_spin_button_update_width_chars()).
 */
export function widthChars(min: number, max: number, digits: number): number {
  return Math.min(10, Math.max(formatValue(min, digits).length, formatValue(max, digits).length));
}

/**
 * Parses the text like gtk_spin_button_default_input(): g_strtod() reads the
 * longest number at its start (0 when there's none), and anything after it is
 * an error unless the whole text is an integer.
 */
export function parseInput(text: string): { value: number; error: boolean } {
  const match = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(text);
  const value = match ? Number.parseFloat(match[0]) : 0;
  const rest = match ? text.slice(match[0].length) : text;
  if (rest === "" || /^-?\d*$/.test(text)) return { value, error: false };
  return { value, error: true };
}

/** Rounds to the nearest step from `min`, halves up (gtk_spin_button_snap()). */
export function snapValue(value: number, min: number, step: number): number {
  if (step === 0) return value;
  const tmp = (value - min) / step;
  return tmp - Math.floor(tmp) < Math.ceil(tmp) - tmp
    ? min + Math.floor(tmp) * step
    : min + Math.ceil(tmp) * step;
}

/**
 * The value after spinning by `increment` (gtk_spin_button_real_spin()): it
 * stops at the bound it passes, and with `wrap`, a value already at that
 * bound goes to the other one.
 */
export function spinValue(
  value: number,
  increment: number,
  min: number,
  max: number,
  wrap: boolean,
): { value: number; wrapped: boolean } {
  let next = value + increment;
  if (increment > 0) {
    if (wrap && Math.abs(value - max) < EPSILON) return { value: min, wrapped: true };
    next = Math.min(next, max);
  } else if (increment < 0) {
    if (wrap && Math.abs(value - min) < EPSILON) return { value: max, wrapped: true };
    next = Math.max(next, min);
  }
  return { value: next, wrapped: false };
}

/**
 * Whether a numeric spin button takes `insert` at `position` of `text`
 * (gtk_spin_button_insert_text()): digits, one sign at the start, and one
 * decimal point when it shows decimals, with at most `digits` after it.
 */
export function numericInsertAllowed(
  text: string,
  insert: string,
  position: number,
  digits: number,
): boolean {
  let sign = /[-+]/.test(text);
  if (sign && position === 0) return false;
  let dotpos = text.indexOf(".");
  if (dotpos > -1 && position > dotpos && digits - text.length + dotpos - insert.length + 1 < 0) {
    return false;
  }
  for (let i = 0; i < insert.length; i++) {
    const ch = insert.charAt(i);
    if (ch === "-" || ch === "+") {
      if (sign || position || i) return false;
      sign = true;
    } else if (ch === ".") {
      if (!digits || dotpos > -1 || insert.length - 1 - i + text.length - position > digits) {
        return false;
      }
      dotpos = position + i;
    } else if (ch < "0" || ch > "9") {
      return false;
    }
  }
  return true;
}

/**
 * Applies an edit of a numeric spin button's text, from `before` to `after`:
 * the removed part goes, and the inserted part only when
 * numericInsertAllowed() takes it, as GtkText deletes the selection before it
 * inserts. Returns the text and where the caret goes when it differs from
 * `after`.
 */
export function filterNumericEdit(
  before: string,
  after: string,
  digits: number,
): { text: string; caret: number } {
  let start = 0;
  const limit = Math.min(before.length, after.length);
  while (start < limit && before[start] === after[start]) start++;
  let end = 0;
  while (end < limit - start && before[before.length - 1 - end] === after[after.length - 1 - end]) {
    end++;
  }
  const kept = before.slice(0, start) + before.slice(before.length - end);
  const insert = after.slice(start, after.length - end);
  if (insert === "" || numericInsertAllowed(kept, insert, start, digits)) {
    return { text: after, caret: start + insert.length };
  }
  return { text: kept, caret: start };
}
