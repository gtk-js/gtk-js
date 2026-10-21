import { GtkTextView, type GtkTextViewProps, registerScrollable } from "@gtk-js/gtk4";
import {
  type CSSProperties,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  applyEdits,
  autoIndentNewline,
  type IndentSettings,
  indentLines,
  insertTabOrSpaces,
  mapOffset,
  type TextEdit,
  unindentLines,
} from "./indent.ts";
import { styleSchemeClass, styleSchemeCSS } from "./scheme-css.ts";
import { type GtkSourceBundledStyleSchemeId, styleSchemes } from "./schemes.ts";
import {
  DEFAULT_STYLE_SCHEME,
  GtkSourceStyleScheme,
  GtkSourceStyleSchemeManager,
} from "./style-scheme.ts";
import { useStylesheet } from "./stylesheet.tsx";
import sourceViewCSS from "./view.css?raw";

export interface GtkSourceViewProps extends Omit<GtkTextViewProps, "gutters" | "belowText"> {
  /**
   * The buffer's style scheme (GtkSourceBuffer:style-scheme): an id the
   * default GtkSourceStyleSchemeManager knows, a scheme, or null for none.
   * Default: "classic", as a new buffer has.
   */
  styleScheme?: GtkSourceBundledStyleSchemeId | (string & {}) | GtkSourceStyleScheme | null;
  /** Whether line numbers are shown beside the text. Default: false. */
  showLineNumbers?: boolean;
  /** Whether the line with the cursor is highlighted. Default: false. */
  highlightCurrentLine?: boolean;
  /** Width of a tab, in characters. Default: 8. */
  tabWidth?: number;
  /** Width of an indentation level, in characters, or -1 for the tab width. Default: -1. */
  indentWidth?: number;
  /** Whether Tab and indentation insert spaces instead of tabs. Default: false. */
  insertSpacesInsteadOfTabs?: boolean;
  /** Whether Enter indents the new line like the one before it. Default: false. */
  autoIndent?: boolean;
  /** Whether Tab and Shift+Tab indent and unindent the selected lines. Default: true. */
  indentOnTab?: boolean;
  /** Whether a line is drawn at the right margin position. Default: false. */
  showRightMargin?: boolean;
  /** The right margin's position, in characters. Default: 80. */
  rightMarginPosition?: number;
  /** Left margin in pixels. Default: 2. */
  leftMargin?: number;
  /** Right margin in pixels. Default: 2. */
  rightMargin?: number;
}

/** gtk_source_style_scheme_manager_get_default(): the bundled schemes. */
let defaultManager: GtkSourceStyleSchemeManager | undefined;
export function getDefaultStyleSchemeManager(): GtkSourceStyleSchemeManager {
  defaultManager ??= new GtkSourceStyleSchemeManager(Object.values(styleSchemes));
  return defaultManager;
}

/**
 * Number of digits the line numbers take room for, at least two: the
 * renderer is as wide as the last number, in whole pixels, and 6px on each
 * side (gtk_source_gutter_renderer_lines_measure()).
 */
function lineNumberDigits(lines: number): number {
  return String(Math.max(99, lines)).length;
}

interface Cursor {
  /** The line of the insertion cursor (the insert mark). */
  line: number;
  /** Whether there's a selection. */
  selection: boolean;
  /** Whether the selection spans lines. */
  multiline: boolean;
}

function lineAt(text: string, offset: number): number {
  let line = 0;
  for (let at = text.indexOf("\n"); at >= 0 && at < offset; at = text.indexOf("\n", at + 1)) line++;
  return line;
}

function readCursor(textarea: HTMLTextAreaElement): Cursor {
  const { value, selectionStart: start, selectionEnd: end, selectionDirection } = textarea;
  const insert = selectionDirection === "backward" ? start : end;
  const line = lineAt(value, insert);
  const other = lineAt(value, insert === start ? end : start);
  return { line, selection: start !== end, multiline: other !== line };
}

/** Replaces the text the edits touch as one edit, which undo reverts, and fires `input`. */
function editText(textarea: HTMLTextAreaElement, edits: readonly TextEdit[]) {
  if (!edits.length) return;
  const from = edits[0]!.from;
  const to = edits[edits.length - 1]!.to;
  const value = textarea.value;
  const edited = applyEdits(value, edits);
  const insert = edited.slice(from, to + edited.length - value.length);
  textarea.setSelectionRange(from, to);
  if (document.execCommand(insert ? "insertText" : "delete", false, insert)) return;
  textarea.setRangeText(insert, from, to, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * The width of `element`'s text as Pango measures it, in whole pixels
 * (pango_layout_get_pixel_size()). Browsers lay text out at the font size
 * truncated to 1/64px, FreeType's fixed point (14.65625px for 11pt), Pango at
 * the size itself: the width is scaled back to it.
 */
function pangoPixelWidth(element: HTMLElement): number {
  const size = parseFloat(getComputedStyle(element).fontSize);
  const laidOut = Math.floor(size * 64) / 64;
  const width = element.getBoundingClientRect().width;
  return Math.ceil(laidOut > 0 ? (width * size) / laidOut - 0.001 : width);
}

/** Selects from `anchor` to `insert` (gtk_text_buffer_select_range (insert, bound)). */
function selectRange(textarea: HTMLTextAreaElement, insert: number, anchor: number) {
  if (insert >= anchor) textarea.setSelectionRange(anchor, insert, "forward");
  else textarea.setSelectionRange(insert, anchor, "backward");
}

/**
 * GtkSourceView — A text view for source code: line numbers, the current
 * line highlighted, a right margin, indentation and style schemes.
 *
 * CSS nodes:
 *   textview.view.GtkSourceView.sourceview
 *     ├── text
 *     └── border.left                (with line numbers)
 *           └── gutter
 *                 └── gutterrenderer (the line numbers)
 *
 * It's a GtkTextView with a gutter in its left border window and the current
 * line and right margin drawn under its text. The buffer's style scheme
 * colors the text, selection, cursor, current line and line numbers.
 *
 * @see https://gnome.pages.gitlab.gnome.org/gtksourceview/gtksourceview5/class.View.html
 */
export const GtkSourceView = forwardRef<HTMLTextAreaElement, GtkSourceViewProps>(
  function GtkSourceView(
    {
      styleScheme = DEFAULT_STYLE_SCHEME,
      showLineNumbers = false,
      highlightCurrentLine = false,
      tabWidth = 8,
      indentWidth = -1,
      insertSpacesInsteadOfTabs = false,
      autoIndent = false,
      indentOnTab = true,
      showRightMargin = false,
      rightMarginPosition = 80,
      leftMargin = 2,
      rightMargin = 2,
      topMargin = 0,
      bottomMargin = 0,
      wrapMode = "none",
      editable = true,
      acceptsTab = true,
      disabled,
      value,
      defaultValue,
      onChange,
      onKeyDown,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const textRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => textRef.current as HTMLTextAreaElement);

    const scheme = useMemo(
      () =>
        typeof styleScheme === "string"
          ? getDefaultStyleSchemeManager().getScheme(styleScheme)
          : styleScheme,
      [styleScheme],
    );
    const schemeStylesheet = useStylesheet(
      scheme ? `gtk-js-source-scheme-${scheme.id}` : null,
      scheme ? () => styleSchemeCSS(scheme) : null,
      scheme,
    );
    const viewStylesheet = useStylesheet("gtk-js-sourceview", () => sourceViewCSS, null);

    // The buffer's text: the value, or the text typed since defaultValue.
    const [ownText, setOwnText] = useState(() => String(defaultValue ?? ""));
    const text = value !== undefined ? String(value) : ownText;
    const lines = useMemo(() => text.split("\n"), [text]);

    const [cursor, setCursor] = useState<Cursor>({ line: 0, selection: false, multiline: false });
    const updateCursor = useCallback(() => {
      const textarea = textRef.current;
      if (!textarea) return;
      const next = readCursor(textarea);
      setCursor((prev) =>
        prev.line === next.line &&
        prev.selection === next.selection &&
        prev.multiline === next.multiline
          ? prev
          : next,
      );
    }, []);
    // The cursor moves with the selection, and with edits ("cursor-moved").
    useLayoutEffect(updateCursor, [text]);
    useEffect(() => {
      const textarea = textRef.current;
      if (!textarea) return;
      const onDocumentSelection = () => {
        if (document.activeElement === textarea) updateCursor();
      };
      const events = ["selectionchange", "select", "input", "keyup", "pointerup", "focus"];
      for (const type of events) textarea.addEventListener(type, updateCursor);
      document.addEventListener("selectionchange", onDocumentSelection);
      return () => {
        for (const type of events) textarea.removeEventListener(type, updateCursor);
        document.removeEventListener("selectionchange", onDocumentSelection);
      };
    }, [updateCursor]);

    // Wrapped lines take more than one row: the gutter's numbers take their heights.
    const linesRef = useRef<HTMLDivElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);
    const [heights, setHeights] = useState<number[] | null>(null);
    useLayoutEffect(() => {
      const container = linesRef.current;
      if (!container || wrapMode === "none" || !showLineNumbers) {
        setHeights(null);
        return;
      }
      const measure = () => {
        const next = Array.from(container.children, (line) => (line as HTMLElement).offsetHeight);
        setHeights((prev) =>
          prev && prev.length === next.length && prev.every((h, i) => h === next[i]) ? prev : next,
        );
      };
      measure();
      const resizes = new ResizeObserver(measure);
      resizes.observe(container);
      return () => resizes.disconnect();
    }, [wrapMode, showLineNumbers, lines]);

    const settings: IndentSettings = {
      tabWidth,
      indentWidth,
      insertSpaces: insertSpacesInsteadOfTabs,
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || !editable || disabled) return;
      const textarea = e.currentTarget;
      const { value: current, selectionStart: start, selectionEnd: end } = textarea;
      const ctrl = e.ctrlKey || e.metaKey;

      // The indenter's trigger: Enter with no Shift, Control or Super.
      if (autoIndent && e.key === "Enter" && !e.shiftKey && !ctrl && !e.altKey) {
        const edit = autoIndentNewline(current, start, end);
        if (!edit) return;
        e.preventDefault();
        editText(textarea, [edit]);
        const caret = edit.from + edit.insert.length;
        textarea.setSelectionRange(caret, caret);
        return;
      }

      if (e.key === "Tab" && !ctrl && !e.altKey && acceptsTab) {
        e.preventDefault();
        const insert = textarea.selectionDirection === "backward" ? start : end;
        const bound = insert === start ? end : start;
        const restore = (edits: TextEdit[]) => {
          editText(textarea, edits);
          if (start !== end)
            selectRange(textarea, mapOffset(insert, edits), mapOffset(bound, edits));
          else textarea.setSelectionRange(mapOffset(insert, edits), mapOffset(insert, edits));
        };
        if (indentOnTab) {
          // Shift+Tab: always unindent.
          if (e.shiftKey) {
            restore(unindentLines(current, start, end, settings));
            return;
          }
          // Tab: indent a selection of whole lines, or one across lines.
          const startsLine = start === 0 || current[start - 1] === "\n";
          const endsLine = end === current.length || current[end] === "\n";
          if (
            start !== end &&
            ((startsLine && endsLine) || lineAt(current, start) !== lineAt(current, end))
          ) {
            restore(indentLines(current, start, end, settings));
            return;
          }
        }
        const { edit, cursor: caret } = insertTabOrSpaces(current, start, end, settings);
        editText(textarea, [edit]);
        const at = caret ?? edit.from + edit.insert.length;
        textarea.setSelectionRange(at, at);
      }
    };

    // Clicks on the line numbers (gutter_renderer_activate()): the cursor to the
    // line's start, Control selects the line, Shift extends the selection to it,
    // a double click selects it. The view keeps its focus, or stays without it.
    const handleGutterMouseDown = (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const textarea = textRef.current;
      if (!textarea || e.button !== 0 || disabled) return;
      const cell = (e.target as Element).closest<HTMLElement>("[data-line]");
      const cells = e.currentTarget.querySelectorAll<HTMLElement>("[data-line]");
      const target = cell ?? cells[cells.length - 1];
      if (!target) return;
      const { value: current, selectionStart: start, selectionEnd: end } = textarea;
      const line = Number(target.dataset.line);
      let lineStart = 0;
      for (let i = 0; i < line; i++) lineStart = current.indexOf("\n", lineStart) + 1;
      const next = current.indexOf("\n", lineStart);
      const lineEnd = next < 0 ? current.length : next;
      if (e.detail === 2 || (e.detail === 1 && (e.ctrlKey || e.metaKey))) {
        selectRange(textarea, lineEnd, lineStart);
      } else if (e.detail === 1 && e.shiftKey) {
        // extend_selection_to_line()
        if (start < lineStart) selectRange(textarea, lineEnd, start);
        else if (end < lineEnd) selectRange(textarea, lineStart, lineEnd);
        else selectRange(textarea, lineStart, end);
      } else if (e.detail === 1) {
        textarea.setSelectionRange(lineStart, lineStart);
      }
      updateCursor();
    };

    // The current line is drawn while the view is sensitive, and neither it
    // nor its number while the selection spans lines
    // (gtk_source_view_paint_current_line_highlight(), gtk_source_gutter_snapshot()).
    const showCurrentLine = highlightCurrentLine && !cursor.multiline;
    const digits = lineNumberDigits(lines.length);

    const classes = ["GtkSourceView", "sourceview"];
    if (scheme) classes.push(styleSchemeClass(scheme));
    if (className) classes.push(className);

    const gutter: ReactNode = showLineNumbers ? (
      <div ref={gutterRef} className="gtk-gutter" onMouseDown={handleGutterMouseDown}>
        {showCurrentLine && (
          <div
            className="gtk-source-gutter-current-line"
            style={{
              top: heights
                ? topMargin + heights.slice(0, cursor.line).reduce((a, b) => a + b, 0)
                : `calc(${topMargin}px + ${cursor.line} * var(--gtk-source-line-height))`,
              height: heights ? heights[cursor.line] : undefined,
            }}
          />
        )}
        <div
          className="gtk-gutterrenderer"
          style={{
            width: `calc(round(up, ${digits}ch, 1px) + 12px)`,
            paddingTop: topMargin,
            paddingBottom: bottomMargin,
          }}
        >
          {lines.map((_, i) => (
            <div
              key={i}
              data-line={i}
              data-cursor-line={i === cursor.line || undefined}
              data-bold={(i === cursor.line && !cursor.selection) || undefined}
              style={heights ? { height: heights[i] } : undefined}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    ) : null;

    // Tabs stop every tabWidth spaces, in whole pixels (set_tab_stops_internal()),
    // or every 8 spaces as Pango has them while the width is the default.
    const tabRef = useRef<HTMLSpanElement>(null);
    const [tabSize, setTabSize] = useState<number | null>(null);
    useLayoutEffect(() => {
      const measurer = tabRef.current;
      if (!measurer) return;
      const measure = () => setTabSize(pangoPixelWidth(measurer));
      measure();
      const resizes = new ResizeObserver(measure);
      resizes.observe(measurer);
      return () => resizes.disconnect();
    }, [tabWidth]);

    // The right margin is as far in as rightMarginPosition underscores are
    // wide, in whole pixels (calculate_real_tab_width()), from the left margin:
    // its background beyond it and its line under the text, and the line
    // again over the current line (gtk_source_view_paint_line_background()).
    // The view draws the first two past the gutter's content width
    // (get_left_gutter_size()), so a gutter border moves them in from the text.
    const margin =
      showRightMargin && rightMarginPosition > 0 ? "_".repeat(rightMarginPosition) : null;
    const marginRef = useRef<HTMLSpanElement>(null);
    const [marginWidth, setMarginWidth] = useState<number | null>(null);
    const [gutterInset, setGutterInset] = useState(0);
    useLayoutEffect(() => {
      const measurer = marginRef.current;
      if (!measurer) return;
      const measure = () => {
        setMarginWidth(pangoPixelWidth(measurer));
        const gutter = gutterRef.current;
        const css = gutter && getComputedStyle(gutter);
        setGutterInset(
          css
            ? ["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"].reduce(
                (sum, side) => sum + parseFloat(css[side as "paddingLeft"]),
                0,
              )
            : 0,
        );
      };
      measure();
      const resizes = new ResizeObserver(measure);
      resizes.observe(measurer);
      if (gutterRef.current) resizes.observe(gutterRef.current);
      return () => resizes.disconnect();
    }, [margin, showLineNumbers, scheme]);
    // Until it's measured (on the server), the width of as many digits.
    const marginX =
      marginWidth !== null
        ? `${leftMargin + marginWidth}px`
        : `calc(${leftMargin}px + round(up, ${rightMarginPosition}ch, 1px))`;
    const viewMarginX = gutterInset ? `calc(${marginX} - ${gutterInset}px)` : marginX;

    const belowText = (
      <>
        <span ref={tabRef} className="gtk-source-measure">
          {" ".repeat(tabWidth)}
        </span>
        {margin && (
          <>
            <span ref={marginRef} className="gtk-source-measure">
              {margin}
            </span>
            <div className="gtk-source-right-margin-overlay" style={{ left: viewMarginX }} />
            <div className="gtk-source-right-margin" style={{ left: viewMarginX }} />
          </>
        )}
        <div
          ref={linesRef}
          className="gtk-source-lines"
          data-wrap={wrapMode}
          data-right-margin={margin ? "" : undefined}
          style={
            {
              paddingTop: topMargin,
              paddingBottom: bottomMargin,
              "--gtk-source-right-margin-x": margin ? marginX : undefined,
            } as CSSProperties
          }
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className="gtk-source-line"
              data-current-line={(showCurrentLine && !disabled && i === cursor.line) || undefined}
              style={{ paddingLeft: leftMargin, paddingRight: rightMargin }}
            >
              {`${line}\n`}
            </div>
          ))}
        </div>
      </>
    );

    return (
      <>
        {viewStylesheet}
        {schemeStylesheet}
        <GtkTextView
          ref={textRef}
          className={classes.join(" ")}
          style={{
            tabSize: tabSize !== null && tabWidth !== 8 ? `${tabSize}px` : tabWidth,
            ...style,
          }}
          gutters={{ left: gutter }}
          belowText={belowText}
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          topMargin={topMargin}
          bottomMargin={bottomMargin}
          wrapMode={wrapMode}
          editable={editable}
          acceptsTab={acceptsTab}
          disabled={disabled}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            if (value === undefined) setOwnText(e.target.value);
            onChange?.(e);
          }}
          onKeyDown={handleKeyDown}
          {...rest}
        />
      </>
    );
  },
);

registerScrollable(GtkSourceView);
