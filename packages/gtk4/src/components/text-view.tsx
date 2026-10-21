import React, {
  forwardRef,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
  canReadSelectionStyle,
  type SelectionRect,
  selectionColor,
  selectionRects,
} from "./text-view-selection.ts";

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
   */
  gutters?: Partial<Record<GtkTextWindowType, ReactNode>>;
  /**
   * Drawn under the text, in the text window and scrolled with it, as a
   * subclass draws GTK_TEXT_VIEW_LAYER_BELOW_TEXT (GtkTextViewClass.snapshot_layer()).
   */
  belowText?: ReactNode;
}

interface TextSelection {
  text: string;
  start: number;
  end: number;
  focused: boolean;
}

interface SelectionPaint {
  color: string;
  rects: SelectionRect[];
}

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
 * style as `textview > text`. The ref is the textarea; className, style and
 * the alignment are the widget's. The view draws the selection under the
 * text in the colors of `textview text selection`, as GTK draws it, and lays
 * gutters (`border.left` etc.) out around the text window. In a
 * GtkScrolledWindow the view scrolls, its text and gutters together.
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

  // The selection, drawn under the text as gtk_text_layout_snapshot() draws
  // it, where the browser lets the theme's ::selection color be read: the
  // browser's own stops at each line's text and isn't drawn while the text
  // is unfocused. It's measured on the paragraphs laid out like the text.
  const paragraphsRef = useRef<HTMLDivElement>(null);
  const selectionLayerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [selectionPaint, setSelectionPaint] = useState<SelectionPaint | null>(null);
  const updateSelection = useCallback(() => {
    const text = textRef.current;
    if (!text || !canReadSelectionStyle()) return;
    text.setAttribute("data-gtk-selection", "");
    const { value, selectionStart: start, selectionEnd: end } = text;
    const focused = document.activeElement === text;
    setSelection((prev) =>
      start === end
        ? null
        : prev?.text === value &&
            prev.start === start &&
            prev.end === end &&
            prev.focused === focused
          ? prev
          : { text: value, start, end, focused },
    );
  }, []);
  useLayoutEffect(updateSelection, [rest.value]);
  useEffect(() => {
    const text = textRef.current;
    if (!text) return;
    updateSelection();
    const onDocumentSelection = () => {
      if (document.activeElement === text) updateSelection();
    };
    const events = ["selectionchange", "select", "input", "focus", "blur", "keyup", "pointerup"];
    for (const type of events) text.addEventListener(type, updateSelection);
    document.addEventListener("selectionchange", onDocumentSelection);
    return () => {
      for (const type of events) text.removeEventListener(type, updateSelection);
      document.removeEventListener("selectionchange", onDocumentSelection);
    };
  }, [updateSelection]);
  useLayoutEffect(() => {
    const paragraphs = paragraphsRef.current;
    const layer = selectionLayerRef.current;
    const text = textRef.current;
    if (!selection || !paragraphs || !layer || !text) {
      setSelectionPaint(null);
      return;
    }
    const measure = () => {
      const lineHeight = parseFloat(
        getComputedStyle(paragraphs.firstElementChild ?? text).lineHeight,
      );
      const rects = selectionRects(
        paragraphs,
        layer,
        selection.start,
        selection.end,
        leftMargin,
        rightMargin,
        lineHeight,
      );
      const color = selectionColor(text);
      setSelectionPaint((prev) =>
        prev?.color === color && JSON.stringify(prev.rects) === JSON.stringify(rects)
          ? prev
          : { color, rects },
      );
    };
    measure();
    const resizes = new ResizeObserver(measure);
    resizes.observe(paragraphs);
    return () => resizes.disconnect();
  }, [selection, leftMargin, rightMargin]);

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

  // A triple click selects the line under it, its newline too
  // (gtk_text_view_click_gesture_pressed(), SELECT_LINES), the same in every browser.
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      onMouseDown?.(e);
      if (e.defaultPrevented || e.button !== 0 || e.detail !== 3) return;
      e.preventDefault();
      const text = e.currentTarget;
      const { value, selectionStart } = text;
      const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const newline = value.indexOf("\n", selectionStart);
      text.setSelectionRange(start, newline < 0 ? value.length : newline + 1, "forward");
    },
    [onMouseDown],
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

  // The view is as tall as its text (gtk_text_view_measure()): reset.css sizes
  // the text node with `field-sizing: content`, or else it's measured here.
  const fitText = useCallback(() => {
    const text = textRef.current;
    if (!text || CSS.supports("field-sizing", "content")) return;
    const css = getComputedStyle(text);
    const paddingX = parseFloat(css.paddingLeft) + parseFloat(css.paddingRight);
    const paddingY = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
    // Contained, it takes no width of its own and fills the widget; else it's
    // as wide as its longest line.
    const contained = css.contain.includes("size");
    text.style.width = "0";
    text.style.minWidth = contained ? `calc(100% - ${paddingX}px)` : "0";
    text.style.height = text.style.minHeight = "0";
    const { scrollWidth, scrollHeight } = text;
    text.style.height = "";
    text.style.minHeight = `${scrollHeight - paddingY}px`;
    if (!contained) {
      text.style.width = "";
      text.style.minWidth = `${scrollWidth - paddingX}px`;
    }
  }, []);
  useLayoutEffect(fitText);
  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text || CSS.supports("field-sizing", "content")) return;
    // Wrapped text takes more or fewer lines at another width.
    let width = text.clientWidth;
    const resizes = new ResizeObserver(() => {
      if (text.clientWidth === width) return;
      width = text.clientWidth;
      fitText();
    });
    resizes.observe(text);
    text.addEventListener("input", fitText);
    return () => {
      resizes.disconnect();
      text.removeEventListener("input", fitText);
    };
  }, [fitText]);

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

  return (
    <div
      ref={rootRef}
      className={classes.join(" ")}
      style={style}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-disabled={disabled || undefined}
      data-drop-active={(dropActive && acceptsDrop) || undefined}
      onPointerMove={unobscureCursor}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={endDrop}
      onDragEnd={endDrop}
    >
      {belowText != null && (
        <div className="gtk-textview-layer" aria-hidden>
          {belowText}
        </div>
      )}
      {selection && (
        <div ref={selectionLayerRef} className="gtk-textview-layer" aria-hidden>
          <div
            ref={paragraphsRef}
            className="gtk-textview-paragraphs"
            style={{
              textAlign,
              paddingLeft: textStyle.paddingLeft,
              paddingRight: rightMargin,
              paddingTop: topMargin,
              paddingBottom: bottomMargin,
              whiteSpace: wrapMode === "none" ? "pre" : "pre-wrap",
              overflowWrap: wrapMode === "word" ? "normal" : "break-word",
              ...({ "--gtk-textview-indent": indent ? `${indent}px` : undefined } as object),
            }}
          >
            {selection.text.split("\n").map((paragraph, i) => (
              <div key={i}>{`${paragraph}\n`}</div>
            ))}
          </div>
          {selectionPaint?.rects.map((rect, i) => (
            <div
              key={i}
              className="gtk-textview-selection"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                backgroundColor: selectionPaint.color,
              }}
            />
          ))}
        </div>
      )}
      <textarea
        ref={textRef}
        className="gtk-text"
        rows={1}
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
      {BORDER_WINDOWS.map(
        (side) =>
          gutters?.[side] != null && (
            <div key={side} className={`gtk-border ${side}`}>
              {gutters[side]}
            </div>
          ),
      )}
    </div>
  );
});
