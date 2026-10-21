import React, {
  forwardRef,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkInputPurpose,
  type GtkJustification,
  type GtkWrapMode,
} from "../types.ts";
import {
  type CursorRect,
  cursorRect,
  displayLineRange,
  type GtkTextViewLayout,
  offsetAtPoint,
  paragraphRows,
  paragraphStarts,
  type SelectionRect,
  selectionRects,
  textColors,
  textScale,
  wordRange,
} from "./text-view-layout.ts";
import { pangoRowHeight } from "./text-view-metrics.ts";

export interface GtkTextViewProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "wrap">,
    GtkAlignProps {
  /** Whether text is editable. Default: true. */
  editable?: boolean;
  /** Whether the cursor is visible. F7 toggles it when it isn't set. Default: true. */
  cursorVisible?: boolean;
  /** Line wrapping mode. Default: "none". */
  wrapMode?: GtkWrapMode | "none";
  /** Text justification. Default: "left". */
  justification?: GtkJustification;
  /** Left margin in pixels. Default: 0. */
  leftMargin?: number;
  /** Right margin in pixels. Default: 0. */
  rightMargin?: number;
  /** Top margin in pixels. Default: 0. */
  topMargin?: number;
  /** Bottom margin in pixels. Default: 0. */
  bottomMargin?: number;
  /** Indent of each paragraph's first line in pixels, or of its other lines when negative. Default: 0. */
  indent?: number;
  /** Use monospace font. Default: false. */
  monospace?: boolean;
  /** Input purpose hint. Default: "free-form". */
  inputPurpose?: GtkInputPurpose;
  /** Whether Tab inserts a tab character. Default: true. */
  acceptsTab?: boolean;
  /** Callback when text changes. */
  onChanged?: (text: string) => void;
  /**
   * Widgets beside the text, each in the border window on its side, which
   * scrolls with the text along its length (gtk_text_view_set_gutter()).
   * A function gets where the text's paragraphs are, once they're laid out.
   */
  gutters?: Partial<Record<GtkTextWindowType, ReactNode | GtkTextViewLayoutRenderer>>;
  /**
   * Drawn under the text, in the text window and scrolled with it, as a
   * subclass draws GTK_TEXT_VIEW_LAYER_BELOW_TEXT (GtkTextViewClass.snapshot_layer()).
   * A function gets where the text's paragraphs are, once they're laid out.
   */
  belowText?: ReactNode | GtkTextViewLayoutRenderer;
}

/** Draws from where a text view's paragraphs are: null until they're laid out. */
export type GtkTextViewLayoutRenderer = (layout: GtkTextViewLayout | null) => ReactNode;

export type { GtkTextViewLayout };

interface TextSelection {
  start: number;
  end: number;
  backward: boolean;
  focused: boolean;
}

interface TextPaint {
  selectionColor: string;
  cursorColor: string;
  rects: SelectionRect[];
  cursor: CursorRect | null;
}

/** How a press and drag selects (SelectionGranularity). */
type Granularity = "characters" | "words" | "lines";

// The cursor blinks for this long a cycle, and stops, shown, after this long
// (gtk-cursor-blink-time, gtk-cursor-blink-timeout); typing or moving it
// keeps it shown for half a cycle first (gtk_text_view_pend_cursor_blink()).
const CURSOR_BLINK_TIME = 1200;
const CURSOR_BLINK_TIMEOUT = 10000;
// Its stem's width per pixel of height, plus one (gtk-cursor-aspect-ratio).
const CURSOR_ASPECT_RATIO = 0.04;

/** The text view's border windows (GtkTextWindowType, but for the text window). */
export type GtkTextWindowType = "left" | "right" | "top" | "bottom";

const BORDER_WINDOWS: readonly GtkTextWindowType[] = ["left", "right", "top", "bottom"];

// The on-screen keyboard GTK's input method shows for each purpose.
const purposeToInputMode: Partial<
  Record<GtkInputPurpose, TextareaHTMLAttributes<HTMLTextAreaElement>["inputMode"]>
> = {
  digits: "numeric",
  pin: "numeric",
  number: "decimal",
  phone: "tel",
  url: "url",
  email: "email",
};

/** What a key press does in a text view (its key bindings, gtk_text_view_class_init()). */
export type GtkTextViewKeyAction =
  | { type: "insert-tab" }
  | { type: "select-all" }
  | { type: "unselect-all" }
  | { type: "delete-paragraph-end" }
  | { type: "toggle-cursor-visible" }
  | { type: "scroll"; axis: "x" | "y"; by: "step" | "page" | "end"; count: 1 | -1 };

export function textViewKeyAction(
  key: Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey">,
  view: { acceptsTab: boolean; editable: boolean; cursorVisible: boolean },
): GtkTextViewKeyAction | null {
  const { ctrlKey: ctrl, shiftKey: shift } = key;
  if (key.altKey || key.metaKey) return null;
  // Tab enters a tab, unless Control is held or the view takes no tabs or
  // isn't editable; then it moves the focus, as the browser does
  // (gtk_text_view_key_controller_key_pressed()).
  if (key.key === "Tab") {
    return view.acceptsTab && view.editable && !ctrl ? { type: "insert-tab" } : null;
  }
  if (ctrl && key.key.toLowerCase() === "a") return { type: shift ? "unselect-all" : "select-all" };
  if (ctrl && !shift && key.key === "/") return { type: "select-all" };
  if (ctrl && !shift && key.key === "\\") return { type: "unselect-all" };
  if (ctrl && shift && key.key === "Delete") return { type: "delete-paragraph-end" };
  if (!ctrl && !shift && key.key === "F7") return { type: "toggle-cursor-visible" };
  // Without a cursor, the movement keys scroll the view (gtk_text_view_move_cursor()).
  if (view.cursorVisible) return null;
  const scroll = (axis: "x" | "y", by: "step" | "page" | "end", count: 1 | -1) =>
    ({ type: "scroll", axis, by, count }) as const;
  switch (key.key) {
    case "ArrowUp":
      return scroll("y", "step", -1);
    case "ArrowDown":
      return scroll("y", "step", 1);
    case "ArrowLeft":
      return scroll("x", "step", -1);
    case "ArrowRight":
      return scroll("x", "step", 1);
    case "PageUp":
      return scroll(ctrl ? "x" : "y", "page", -1);
    case "PageDown":
      return scroll(ctrl ? "x" : "y", "page", 1);
    case "Home":
      return scroll(ctrl ? "y" : "x", "end", -1);
    case "End":
      return scroll(ctrl ? "y" : "x", "end", 1);
    default:
      return null;
  }
}

/** Replaces the selection like typing does, so it can be undone and fires `input`. */
function editText(text: HTMLTextAreaElement, insert: string) {
  if (document.execCommand(insert ? "insertText" : "delete", false, insert)) return;
  text.setRangeText(insert, text.selectionStart, text.selectionEnd, "end");
  text.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * GtkTextView — A multi-line text editor widget.
 *
 * CSS node:
 *   textview.view
 *     └── text
 *
 * The text node, a <textarea>, holds the text and its margins, which themes
 * style as `textview > text`, and takes the typing, input methods, pastes,
 * undo and the keyboard's selection. The ref is the textarea; className,
 * style and the alignment are the widget's.
 *
 * The view draws the text itself, laid out as GtkTextLayout lays it out: a
 * <textarea> gives all its rows one height, where each paragraph is as tall
 * as its rows to the nearest pixel (a wrapped paragraph of Adwaita Mono's
 * 18.33px rows is 55px, not 54px). Over it, the textarea's own text, cursor
 * and selection are transparent; the view draws the selection under the text
 * and the cursor over it in the theme's colors, and maps presses to the text
 * it draws. Gutters (`border.left` etc.) are laid out around the text window.
 * In a GtkScrolledWindow the view scrolls, its text and gutters together.
 *
 * @see https://docs.gtk.org/gtk4/class.TextView.html
 */
export const GtkTextView = forwardRef<HTMLTextAreaElement, GtkTextViewProps>(function GtkTextView(
  {
    editable = true,
    cursorVisible,
    wrapMode = "none",
    justification = "left",
    leftMargin = 0,
    rightMargin = 0,
    topMargin = 0,
    bottomMargin = 0,
    indent = 0,
    monospace = false,
    inputPurpose = "free-form",
    acceptsTab = true,
    onChanged,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    onChange,
    onInput,
    onKeyDown,
    onMouseDown,
    disabled,
    gutters,
    belowText,
    ...rest
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => textRef.current as HTMLTextAreaElement);

  // F7 toggles the cursor when the app doesn't set it (gtk_text_view_toggle_cursor_visible()).
  const [ownCursorVisible, setOwnCursorVisible] = useState(true);
  const showCursor = cursorVisible ?? ownCursorVisible;
  const [dropActive, setDropActive] = useState(false);

  // The text as the textarea has it, typed or set.
  const [shown, setShown] = useState(() => String(rest.value ?? rest.defaultValue ?? ""));
  const syncText = useCallback(() => {
    const text = textRef.current;
    if (text) setShown(text.value);
  }, []);
  useLayoutEffect(syncText);
  const paragraphs = useMemo(() => shown.split("\n"), [shown]);
  const starts = useMemo(() => paragraphStarts(shown), [shown]);

  // A row is as tall as Pango's for the text's font; the view draws the text
  // where it can measure that (not on the server).
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const [, setThemeChanges] = useState(0);
  const measureRowHeight = useCallback(() => {
    const text = textRef.current;
    if (text) setRowHeight(pangoRowHeight(text));
  }, []);
  useLayoutEffect(measureRowHeight);
  useEffect(() => {
    const restyle = () => {
      setThemeChanges((n) => n + 1);
      measureRowHeight();
    };
    const dark = matchMedia?.("(prefers-color-scheme: dark)");
    document.fonts?.addEventListener("loadingdone", restyle);
    dark?.addEventListener("change", restyle);
    return () => {
      document.fonts?.removeEventListener("loadingdone", restyle);
      dark?.removeEventListener("change", restyle);
    };
  }, [measureRowHeight]);
  const drawn = rowHeight != null;
  const lineHeight = rowHeight != null ? Math.round(rowHeight) : null;

  // Each paragraph's rows, as the text is laid out in the paragraphs' blocks.
  const layerRef = useRef<HTMLDivElement>(null);
  const paragraphsRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<number[] | null>(null);
  const measureRows = useCallback(() => {
    const container = paragraphsRef.current;
    if (!container || rowHeight == null) return;
    const next = paragraphRows(container, rowHeight);
    setRows((prev) =>
      prev && prev.length === next.length && prev.every((n, i) => n === next[i]) ? prev : next,
    );
  }, [rowHeight]);
  // The rows change with the text and how it's laid out.
  useLayoutEffect(measureRows, [measureRows, shown, wrapMode, leftMargin, rightMargin, indent]);
  useLayoutEffect(() => {
    const container = paragraphsRef.current;
    if (!container || !drawn) return;
    const resizes = new ResizeObserver(measureRows);
    resizes.observe(container);
    return () => resizes.disconnect();
  }, [measureRows, drawn]);

  // Where the paragraphs are (gtk_text_layout_get_line_yrange()).
  const layout = useMemo<GtkTextViewLayout | null>(() => {
    if (rowHeight == null || !rows || rows.length !== paragraphs.length) return null;
    let top = topMargin;
    return {
      rowHeight,
      paragraphs: rows.map((n) => {
        const height = Math.round(n * rowHeight);
        const box = { top, height };
        top += height;
        return box;
      }),
    };
  }, [rowHeight, rows, paragraphs.length, topMargin]);

  // The selection and the cursor, as the textarea has them.
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const selectionRef = useRef<TextSelection | null>(null);
  const [blink, setBlink] = useState({ key: 0, delay: 0 });
  const updateSelection = useCallback((e?: Event) => {
    const text = textRef.current;
    if (!text) return;
    setShown(text.value);
    const { selectionStart: start, selectionEnd: end } = text;
    const backward = text.selectionDirection === "backward";
    const focused = document.activeElement === text;
    const prev = selectionRef.current;
    if (
      prev?.start === start &&
      prev.end === end &&
      prev.backward === backward &&
      prev.focused === focused
    ) {
      return;
    }
    const next = { start, end, backward, focused };
    selectionRef.current = next;
    setSelection(next);
    // The cursor shows again where it moves, for half a blink after it was
    // typed or moved, from the start of one when the view takes the focus.
    setBlink((b) => ({ key: b.key + 1, delay: e?.type === "focus" ? 0 : CURSOR_BLINK_TIME / 2 }));
  }, []);
  useLayoutEffect(updateSelection, [rest.value]);
  useEffect(() => {
    const text = textRef.current;
    if (!text) return;
    updateSelection();
    const onDocumentSelection = () => {
      if (document.activeElement === text) updateSelection();
    };
    // Not on `input`: React reads an edit from it after this, and a render
    // in between would take a controlled view's edit back. Edits update the
    // text through onChange.
    const events = [
      "selectionchange",
      "select",
      "focus",
      "blur",
      "keyup",
      "pointerup",
      "compositionend",
    ];
    for (const type of events) text.addEventListener(type, updateSelection);
    document.addEventListener("selectionchange", onDocumentSelection);
    return () => {
      for (const type of events) text.removeEventListener(type, updateSelection);
      document.removeEventListener("selectionchange", onDocumentSelection);
    };
  }, [updateSelection]);

  // The text in the text node's font and color, as the theme and the app
  // give them, and the selection and the cursor in theirs.
  const [paint, setPaint] = useState<TextPaint | null>(null);
  useLayoutEffect(() => {
    const text = textRef.current;
    const container = paragraphsRef.current;
    const layer = layerRef.current;
    if (!text || !container || !layer || !drawn) return;
    const css = getComputedStyle(text);
    for (const property of [
      "color",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "fontStretch",
      "fontVariant",
      "fontFeatureSettings",
      "fontVariationSettings",
      "letterSpacing",
      "wordSpacing",
      "tabSize",
    ] as const) {
      layer.style[property] = css[property];
    }
  });
  useLayoutEffect(() => {
    const text = textRef.current;
    const container = paragraphsRef.current;
    const layer = layerRef.current;
    if (!text || !container || !layer || !selection || rowHeight == null || !layout) {
      setPaint(null);
      return;
    }
    const measure = () => {
      const colors = textColors(text);
      const probe = layer.querySelector<HTMLElement>(":scope > .gtk-textview-probe");
      const scale = probe ? textScale(probe) : 1;
      const rects = selectionRects(
        container,
        layer,
        starts,
        selection.start,
        selection.end,
        leftMargin,
        rightMargin,
        rowHeight,
        scale,
      );
      // The cursor is drawn while the view has the focus and nothing is
      // selected (add_cursor()).
      const cursor =
        selection.focused && selection.start === selection.end && showCursor && !disabled
          ? cursorRect(container, layer, starts, selection.start, rowHeight, scale)
          : null;
      const next: TextPaint = {
        selectionColor: colors.selection,
        cursorColor: colors.cursor,
        rects,
        cursor,
      };
      setPaint((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    const resizes = new ResizeObserver(measure);
    resizes.observe(container);
    return () => resizes.disconnect();
  }, [selection, layout, starts, rowHeight, leftMargin, rightMargin, showCursor, disabled, drawn]);

  // An input method's text is underlined while it's composed (its preedit's
  // attributes, gtk_text_layout_set_preedit_string()).
  const [preedit, setPreedit] = useState<[number, number] | null>(null);
  useEffect(() => {
    const text = textRef.current;
    if (!text) return;
    let start = 0;
    const begin = () => {
      start = Math.min(text.selectionStart, text.selectionEnd);
    };
    const update = (e: CompositionEvent) => setPreedit([start, start + e.data.length]);
    const end = () => setPreedit(null);
    text.addEventListener("compositionstart", begin);
    text.addEventListener("compositionupdate", update);
    text.addEventListener("compositionend", end);
    return () => {
      text.removeEventListener("compositionstart", begin);
      text.removeEventListener("compositionupdate", update);
      text.removeEventListener("compositionend", end);
    };
  }, []);
  const preeditRects = useMemo(() => {
    const container = paragraphsRef.current;
    const layer = layerRef.current;
    if (!preedit || !container || !layer || rowHeight == null || !layout) return [];
    return selectionRects(container, layer, starts, preedit[0], preedit[1], 0, 0, rowHeight)
      .filter((rect) => rect.x >= 0)
      .map((rect) => ({ ...rect, y: rect.y + rect.height - 2, height: 1 }));
  }, [preedit, starts, rowHeight, layout]);

  const classes = ["gtk-textview", "view"];
  if (monospace) classes.push("monospace");
  if (className) classes.push(className);

  const textAlign =
    justification === "left"
      ? "start"
      : justification === "right"
        ? "end"
        : justification === "fill"
          ? "justify"
          : justification;

  const cssWrap = wrapMode === "none" ? "off" : "soft";

  // The margins are the text's, inside the text node (gtk_text_view_set_left_margin()).
  // The indent is each paragraph's, which reset.css applies where it can; a
  // negative one indents the paragraph's other lines instead (pango_layout_set_indent()).
  const textStyle = {
    textAlign,
    paddingLeft: leftMargin + Math.max(0, -indent),
    paddingRight: rightMargin,
    paddingTop: topMargin,
    paddingBottom: bottomMargin,
    "--gtk-textview-indent": indent ? `${indent}px` : undefined,
    // GTK_WRAP_WORD never breaks a word; one too long for the line runs past it.
    overflowWrap: wrapMode === "word" ? "normal" : undefined,
    caretColor: showCursor ? undefined : "transparent",
    resize: "none",
  } as React.CSSProperties;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setShown(e.target.value);
      onChanged?.(e.target.value);
      onChange?.(e);
    },
    [onChanged, onChange],
  );

  // Typing hides the pointer until it moves (gtk_text_view_obscure_mouse_cursor()).
  const handleInput = useCallback(
    (e: React.InputEvent<HTMLTextAreaElement>) => {
      if (/^insert(Text|CompositionText|LineBreak|Paragraph)$/.test(e.nativeEvent.inputType)) {
        rootRef.current?.setAttribute("data-cursor-obscured", "");
      }
      onInput?.(e);
    },
    [onInput],
  );
  const unobscureCursor = useCallback(() => {
    rootRef.current?.removeAttribute("data-cursor-obscured");
  }, []);

  // A press places the cursor at the text the view draws under it, a double
  // press selects a word, a triple one a display line, Shift extends the
  // selection, and dragging extends it by the same steps
  // (gtk_text_view_click_gesture_pressed(), gtk_text_view_start_selection_drag()).
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      onMouseDown?.(e);
      const text = e.currentTarget;
      const container = paragraphsRef.current;
      if (e.defaultPrevented || e.button !== 0 || !container || rowHeight == null) return;
      e.preventDefault();
      text.focus({ preventScroll: true });
      const hit = (x: number, y: number) => {
        text.style.pointerEvents = "none";
        try {
          return offsetAtPoint(container, starts, x, y) ?? text.value.length;
        } finally {
          text.style.pointerEvents = "";
        }
      };
      const value = text.value;
      const granularity: Granularity =
        e.detail >= 3 ? "lines" : e.detail === 2 ? "words" : "characters";
      const extent = (offset: number): [number, number] =>
        granularity === "words"
          ? wordRange(value, offset)
          : granularity === "lines"
            ? displayLineRange(container, starts, value, offset, rowHeight)
            : [offset, offset];
      const select = (from: number, to: number) => {
        if (from <= to) text.setSelectionRange(from, to, "forward");
        else text.setSelectionRange(to, from, "backward");
      };
      const at = hit(e.clientX, e.clientY);
      let anchor = extent(at);
      if (e.shiftKey && granularity === "characters") {
        // Shift extends the selection from its other end (extend_selection()).
        const other =
          text.selectionDirection === "backward" ? text.selectionEnd : text.selectionStart;
        anchor = [other, other];
        select(other, at);
      } else {
        select(anchor[0], anchor[1]);
      }
      const move = (event: MouseEvent) => {
        const [start, end] = extent(hit(event.clientX, event.clientY));
        if (start < anchor[0]) select(anchor[1], start);
        else select(anchor[0], Math.max(end, anchor[1]));
      };
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    },
    [onMouseDown, rowHeight, starts],
  );
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const action = textViewKeyAction(e, { acceptsTab, editable, cursorVisible: showCursor });
      if (!action) return;
      e.preventDefault();
      const text = e.currentTarget;
      switch (action.type) {
        case "insert-tab":
          editText(text, "\t");
          break;
        case "select-all":
          // The cursor at the start (gtk_text_view_select_all()).
          text.setSelectionRange(0, text.value.length, "backward");
          break;
        case "unselect-all": {
          const insert =
            text.selectionDirection === "backward" ? text.selectionStart : text.selectionEnd;
          text.setSelectionRange(insert, insert);
          break;
        }
        case "delete-paragraph-end": {
          if (!editable) break;
          // The selection, else up to the paragraph's end, or its newline when
          // already there (gtk_text_view_delete_from_cursor()).
          const { value, selectionStart: start, selectionEnd: end } = text;
          if (start === end) {
            const newline = value.indexOf("\n", start);
            const to = newline === start ? start + 1 : newline < 0 ? value.length : newline;
            if (to === start) break;
            text.setSelectionRange(start, to);
          }
          editText(text, "");
          break;
        }
        case "toggle-cursor-visible":
          if (cursorVisible === undefined) setOwnCursorVisible((visible) => !visible);
          break;
        case "scroll": {
          // The view's adjustments: it scrolls its own text, in a scrolled window
          // too (GtkScrollable). A step is a tenth of the page, a page nine
          // tenths (gtk_text_view_set_vadjustment_values()).
          const scroller = rootRef.current ?? text;
          const [page, upper] =
            action.axis === "y"
              ? [scroller.clientHeight, scroller.scrollHeight]
              : [scroller.clientWidth, scroller.scrollWidth];
          const increment =
            action.by === "step" ? page * 0.1 : action.by === "page" ? page * 0.9 : upper;
          scroller.scrollBy({ [action.axis === "y" ? "top" : "left"]: action.count * increment });
          break;
        }
      }
    },
    [acceptsTab, editable, showCursor, cursorVisible, onKeyDown],
  );

  // A view that isn't editable keeps its cursor (gtk_text_view_set_editable()),
  // which a readonly <textarea> doesn't draw, so its edits are refused instead.
  // An input method's text can't be refused; it's undone when it's committed.
  useEffect(() => {
    const text = textRef.current;
    if (!text || editable) return;
    let saved: [string, number, number] | null = null;
    const refuse = (e: Event) => e.preventDefault();
    const save = () => {
      saved = [text.value, text.selectionStart, text.selectionEnd];
    };
    const hide = (e: Event) => e.stopPropagation();
    const restore = () => {
      if (!saved) return;
      text.value = saved[0];
      text.setSelectionRange(saved[1], saved[2]);
      saved = null;
    };
    text.addEventListener("beforeinput", refuse);
    text.addEventListener("compositionstart", save);
    text.addEventListener("input", hide);
    text.addEventListener("compositionend", restore);
    return () => {
      text.removeEventListener("beforeinput", refuse);
      text.removeEventListener("compositionstart", save);
      text.removeEventListener("input", hide);
      text.removeEventListener("compositionend", restore);
    };
  }, [editable]);

  // A scrolling view keeps the text the caret moves to out from under the
  // border windows, which stay on their sides (GtkTextView scrolls the text
  // window alone, beside them).
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sizes = new ResizeObserver(() => {
      const size = (side: GtkTextWindowType) => {
        const border = root.querySelector<HTMLElement>(`:scope > .gtk-border.${side}`);
        if (!border) return 0;
        return side === "left" || side === "right" ? border.offsetWidth : border.offsetHeight;
      };
      const sides = ["top", "right", "bottom", "left"] as const;
      root.style.scrollPadding = sides.map((side) => `${size(side)}px`).join(" ");
    });
    for (const border of root.querySelectorAll(":scope > .gtk-border")) sizes.observe(border);
    return () => {
      sizes.disconnect();
      root.style.scrollPadding = "";
    };
  });

  // Text dragged over an editable view sets :drop(active) (its GtkDropTarget).
  const acceptsDrop = editable && !disabled;
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (acceptsDrop && e.dataTransfer.types.includes("text/plain")) setDropActive(true);
    },
    [acceptsDrop],
  );
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropActive(false);
  }, []);
  const endDrop = useCallback(() => setDropActive(false), []);

  const render = (content: ReactNode | GtkTextViewLayoutRenderer) =>
    typeof content === "function" ? content(layout) : content;
  const below = render(belowText);
  const cursor = paint?.cursor;
  const cursorHeight = cursor?.height ?? 0;
  // The cursor blinks while the view is editable (cursor_blinks()).
  const cursorBlinks = editable && !disabled;
  const blinks = Math.max(0, (CURSOR_BLINK_TIMEOUT - blink.delay) / CURSOR_BLINK_TIME);

  return (
    <div
      ref={rootRef}
      className={classes.join(" ")}
      style={
        rowHeight == null
          ? style
          : ({
              ...style,
              "--gtk-textview-line-height": `${lineHeight}px`,
              "--gtk-textview-row-height": `${rowHeight}px`,
            } as React.CSSProperties)
      }
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-disabled={disabled || undefined}
      data-drop-active={(dropActive && acceptsDrop) || undefined}
      data-gtk-drawn={drawn || undefined}
      onPointerMove={unobscureCursor}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={endDrop}
      onDragEnd={endDrop}
    >
      {below != null && (
        <div className="gtk-textview-layer" aria-hidden>
          {below}
        </div>
      )}
      <div ref={layerRef} className="gtk-textview-layer gtk-textview-text-layer" aria-hidden>
        {paint?.rects.map((rect, i) => (
          <div
            key={i}
            className="gtk-textview-selection"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              backgroundColor: paint.selectionColor,
            }}
          />
        ))}
        <div
          ref={paragraphsRef}
          className="gtk-textview-paragraphs"
          data-wrap={wrapMode}
          style={
            {
              textAlign,
              paddingLeft: textStyle.paddingLeft,
              paddingRight: rightMargin,
              paddingTop: topMargin,
              paddingBottom: bottomMargin,
              "--gtk-textview-indent": indent ? `${indent}px` : undefined,
            } as React.CSSProperties
          }
        >
          {paragraphs.map((paragraph, i) => (
            <div
              key={i}
              className="gtk-textview-paragraph"
              style={layout ? { height: layout.paragraphs[i]!.height } : undefined}
            >
              <div>{`${paragraph}\n`}</div>
            </div>
          ))}
        </div>
        <span className="gtk-textview-probe">MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM</span>
        {preeditRects.map((rect, i) => (
          <div
            key={`preedit-${i}`}
            className="gtk-textview-preedit"
            style={{ left: rect.x, top: rect.y, width: rect.width }}
          />
        ))}
        {cursor && (
          <div
            key={blink.key}
            className="gtk-textview-cursor"
            data-blink={cursorBlinks || undefined}
            style={{
              left: cursor.x,
              top: cursor.y,
              width: Math.floor(cursorHeight * CURSOR_ASPECT_RATIO + 1),
              height: cursorHeight,
              backgroundColor: paint?.cursorColor,
              animationDelay: `${blink.delay}ms`,
              animationIterationCount: blinks,
            }}
          />
        )}
      </div>
      <textarea
        ref={textRef}
        className="gtk-text"
        rows={1}
        // GtkTextView checks no spelling; the browser would mark it on the
        // textarea, not the text the view draws.
        spellCheck={false}
        aria-readonly={!editable || undefined}
        inputMode={editable ? purposeToInputMode[inputPurpose] : "none"}
        wrap={cssWrap}
        style={textStyle}
        disabled={disabled}
        onChange={handleChange}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        {...rest}
      />
      {BORDER_WINDOWS.map((side) => {
        const gutter = render(gutters?.[side]);
        return (
          gutter != null && (
            <div key={side} className={`gtk-border ${side}`}>
              {gutter}
            </div>
          )
        );
      })}
    </div>
  );
});
