/**
 * GtkSourceView's indentation editing, on a string and UTF-16 offsets: what
 * Tab, Shift+Tab and Enter do (gtk_source_view_key_pressed()).
 */

/** Replaces `text.slice(from, to)` with `insert`, offsets in the original text. */
export interface TextEdit {
  from: number;
  to: number;
  insert: string;
}

export interface IndentSettings {
  tabWidth: number;
  /** -1 for the tab width. */
  indentWidth: number;
  insertSpaces: boolean;
}

/** get_real_indent_width() */
function realIndentWidth({ tabWidth, indentWidth }: IndentSettings): number {
  return indentWidth < 0 ? tabWidth : indentWidth;
}

/** get_indent_string() */
function indentString(tabs: number, spaces: number): string {
  return "\t".repeat(tabs) + " ".repeat(spaces);
}

function lineStart(text: string, offset: number): number {
  return text.lastIndexOf("\n", offset - 1) + 1;
}

function lineEnd(text: string, offset: number): number {
  const end = text.indexOf("\n", offset);
  return end < 0 ? text.length : end;
}

/** The first offset of each line from `start`'s to `end`'s. */
function lineStarts(text: string, start: number, end: number): number[] {
  const starts = [lineStart(text, start)];
  let last = lineStart(text, end);
  // A selection ending at a line's start doesn't take in that line, unless it's
  // all the selection has.
  if (last === end && last > starts[0]!) last = lineStart(text, end - 1);
  for (let next = text.indexOf("\n", starts[0]!); next >= 0 && next < last; ) {
    starts.push(next + 1);
    next = text.indexOf("\n", next + 1);
  }
  return starts;
}

/** gtk_source_view_indent_lines(): one indentation level on each non-empty line. */
export function indentLines(
  text: string,
  start: number,
  end: number,
  settings: IndentSettings,
): TextEdit[] {
  const { tabWidth, indentWidth, insertSpaces } = settings;
  let tabs = 0;
  let spaces = 0;
  if (insertSpaces) {
    spaces = realIndentWidth(settings);
  } else if (indentWidth > 0 && indentWidth !== tabWidth) {
    spaces = indentWidth % tabWidth;
    tabs = Math.floor(indentWidth / tabWidth);
  } else {
    tabs = 1;
  }
  const tabBuffer = indentString(tabs, spaces);

  const edits: TextEdit[] = [];
  for (const line of lineStarts(text, start, end)) {
    // Empty lines get no trailing whitespace.
    if (line === text.length || text[line] === "\n") continue;
    // Spaces always go after the tabs, where they show.
    let at = line;
    while (text[at] === "\t") at++;
    // With tabs, merge the spaces there with the new indentation.
    let replaced = 0;
    while (!insertSpaces && text[at + replaced] === " " && replaced < tabWidth) replaced++;
    if (replaced > 0) {
      const t = tabs + Math.floor((spaces + replaced) / tabWidth);
      const s = (spaces + replaced) % tabWidth;
      edits.push({ from: at, to: at + replaced, insert: indentString(t, s) });
    } else {
      edits.push({ from: at, to: at, insert: tabBuffer });
    }
  }
  return edits;
}

/** gtk_source_view_unindent_lines(): one indentation level off each line. */
export function unindentLines(
  text: string,
  start: number,
  end: number,
  settings: IndentSettings,
): TextEdit[] {
  const { tabWidth } = settings;
  const indentWidth = realIndentWidth(settings);
  const edits: TextEdit[] = [];
  for (const line of lineStarts(text, start, end)) {
    let toDelete = 0;
    let equivalent = 0;
    for (let at = line; at < text.length && text[at] !== "\n" && equivalent < indentWidth; at++) {
      if (text[at] === "\t") equivalent += tabWidth - (equivalent % tabWidth);
      else if (text[at] === " ") equivalent++;
      else break;
      toDelete++;
    }
    if (toDelete > 0) edits.push({ from: line, to: line + toDelete, insert: "" });
  }
  return edits;
}

/** get_line_offset_in_equivalent_spaces(): the column, a tab running to its next stop. */
function column(text: string, offset: number, tabWidth: number): number {
  let n = 0;
  for (let at = lineStart(text, offset); at < offset; at++) {
    n = text[at] === "\t" ? n + tabWidth - (n % tabWidth) : n + 1;
  }
  return n;
}

/**
 * insert_tab_or_spaces(): what Tab enters in place of the selection, and
 * where the cursor goes when it isn't after the insertion.
 */
export function insertTabOrSpaces(
  text: string,
  start: number,
  end: number,
  settings: IndentSettings,
): { edit: TextEdit; cursor?: number } {
  const { tabWidth, indentWidth, insertSpaces } = settings;
  if (insertSpaces) {
    const width = realIndentWidth(settings);
    const spaces = width - (column(text, start, tabWidth) % width);
    return { edit: { from: start, to: end, insert: " ".repeat(spaces) } };
  }
  if (indentWidth > 0 && indentWidth !== tabWidth) {
    const from = column(text, start, tabWidth);
    const to = indentWidth * (1 + Math.floor(from / indentWidth));
    // Take in the spaces before, so that two indentation levels narrower than
    // a tab become a tab, and the tabs after, before which spaces wouldn't show.
    let preceding = 0;
    while (preceding < tabWidth && text[start - preceding - 1] === " ") preceding++;
    let following = 0;
    while (text[end + following] === "\t") following++;
    const tabs = Math.floor((preceding + to - from) / tabWidth);
    const spaces = (preceding + to - from) % tabWidth;
    const editStart = start - preceding;
    return {
      edit: {
        from: editStart,
        to: end + following,
        insert: indentString(tabs + following, spaces),
      },
      cursor: editStart + tabs + (following > 0 ? 1 : spaces),
    };
  }
  return { edit: { from: start, to: end, insert: "\t" } };
}

/**
 * The default indenter's Enter (trigger_on_newline(),
 * indent_by_copying_previous_line()): a new line indented like the one the
 * cursor was on, replacing the whitespace after the cursor. Null where Enter
 * isn't a trigger: with a selection, or at a line's start.
 */
export function autoIndentNewline(text: string, start: number, end: number): TextEdit | null {
  if (start !== end || start === lineStart(text, start)) return null;
  let after = start;
  while (after < lineEnd(text, start) && /\s/.test(text[after]!)) after++;
  const line = lineStart(text, start);
  let prefixEnd = line;
  while (prefixEnd < lineEnd(text, line) && /\s/.test(text[prefixEnd]!)) prefixEnd++;
  // The prefix is the line's as it is once the newline is in: up to the cursor.
  const prefix = text.slice(line, Math.min(prefixEnd, start));
  return { from: start, to: after, insert: `\n${prefix}` };
}

/**
 * Where an offset ends up after the edits, as a mark with right gravity moves
 * (the selection marks _gtk_source_buffer_save_and_clear_selection() makes).
 */
export function mapOffset(offset: number, edits: readonly TextEdit[]): number {
  let shift = 0;
  for (const { from, to, insert } of edits) {
    if (offset < from) break;
    if (offset < to) return from + shift + insert.length;
    shift += insert.length - (to - from);
  }
  return offset + shift;
}

/** The text with the edits (in order, not overlapping) applied. */
export function applyEdits(text: string, edits: readonly TextEdit[]): string {
  let result = "";
  let at = 0;
  for (const { from, to, insert } of edits) {
    result += text.slice(at, from) + insert;
    at = to;
  }
  return result + text.slice(at);
}
