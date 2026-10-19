import {
  type CSSProperties,
  type FocusEvent,
  Fragment,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { parseMarkup } from "../markup.tsx";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkEllipsizeMode,
  type GtkJustification,
  type GtkWrapMode,
} from "../types.ts";

export interface GtkLabelProps extends HTMLAttributes<HTMLSpanElement>, GtkAlignProps {
  /** Text content. */
  label: string;
  /**
   * Whether the label is Pango markup: `<b>`, `<i>`, `<span>` and Pango's
   * other tags, and `<a href="…" title="…" class="…">` links. Default: false.
   */
  useMarkup?: boolean;
  /** Text justification. Default: "left". */
  justify?: GtkJustification;
  /** Whether to wrap text. Default: false. */
  wrap?: boolean;
  /** How to wrap. Default: "word". */
  wrapMode?: GtkWrapMode;
  /** Whether the text is selectable. Default: false. */
  selectable?: boolean;
  /** Ellipsize mode. Default: "none". */
  ellipsize?: GtkEllipsizeMode;
  /** Minimum width in characters. Default: -1 (natural). */
  widthChars?: number;
  /** The natural width in characters, which a wider allocation can exceed. Default: -1 (the text's). */
  maxWidthChars?: number;
  /** The number of lines a wrapping, ellipsized label is limited to. Default: -1 (one line per paragraph). */
  lines?: number;
  /** Horizontal alignment 0.0 (left) to 1.0 (right). Default: 0.5. */
  xalign?: number;
  /** Vertical alignment 0.0 (top) to 1.0 (bottom). Default: 0.5. */
  yalign?: number;
  /** Whether the widget is insensitive (disabled). Default: false. */
  disabled?: boolean;
  /**
   * Called with the URI of a link in the markup when it's activated
   * (GtkLabel::activate-link). Return true when it was handled; otherwise the
   * URI opens, like the signal's default handler.
   */
  onActivateLink?: (uri: string) => boolean | void;
}

/**
 * The text style of a label that wraps (GtkLabel:wrap). Pango keeps every
 * space and line break ("pre-wrap"). With "word-char" or "char" wrapping, a
 * word too long for a line breaks between characters, so the label's minimum
 * width is a character or so rather than its longest word (gtk_label_measure()).
 * `anywhere` counts those breaks in min-content, unlike `break-word`: a long
 * path shrinks with its box instead of overflowing it.
 */
export function wrapStyle(mode: GtkWrapMode = "word"): React.CSSProperties {
  return { whiteSpace: "pre-wrap", overflowWrap: mode === "word" ? "normal" : "anywhere" };
}

/**
 * GtkLabel — A widget that displays text.
 *
 * CSS node:
 *   label[.link]
 *     └── [link[:link|:visited]] (one per `<a>` in the markup)
 *
 * @see https://docs.gtk.org/gtk4/class.Label.html
 */
export const GtkLabel = forwardRef<HTMLSpanElement, GtkLabelProps>(function GtkLabel(
  {
    label: text,
    useMarkup = false,
    justify = "left",
    wrap = false,
    wrapMode = "word",
    selectable = false,
    ellipsize = "none",
    widthChars = -1,
    maxWidthChars = -1,
    lines = -1,
    xalign = 0.5,
    yalign = 0.5,
    disabled = false,
    onActivateLink,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    onMouseDown,
    onFocus,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const rootRef = useRef<HTMLSpanElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLSpanElement);

  // The URIs of the links that were activated (GtkLabelLink.visited).
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());

  // A selectable label is focusable (gtk_label_ensure_select_info()); a primary
  // press focuses it without selecting everything (in_click).
  const focusable = selectable && !disabled;
  const inClick = useRef(false);

  // An insensitive label loses its selection (gtk_label_state_flags_changed()).
  useEffect(() => {
    const selection = disabled ? getSelection() : null;
    if (selection?.anchorNode && rootRef.current?.contains(selection.anchorNode)) {
      selection.removeAllRanges();
    }
  }, [disabled]);

  const classes = ["gtk-label"];

  const textAlign =
    justify === "left"
      ? "start"
      : justify === "right"
        ? "end"
        : justify === "fill"
          ? "justify"
          : justify;

  const cssStyle: React.CSSProperties = {
    textAlign,
    userSelect: focusable ? "text" : "none",
    // GTK sets the text cursor on the whole label (gtk_label_update_cursor()).
    cursor: focusable ? "text" : undefined,
    // xalign and yalign place the text in a label bigger than it
    // (gtk_label_get_layout_location()). Flex start and end follow the text
    // direction, as GTK flips xalign in RTL.
    justifyContent: flexAlign(xalign),
    ...(yalign !== 0.5 && { alignItems: flexAlign(yalign) }),
    ...style,
  };

  // Pango keeps every space and line break of the text: "pre" rather than the
  // collapsing "nowrap".
  if (!wrap) cssStyle.whiteSpace = "pre";
  else Object.assign(cssStyle, wrapStyle(wrapMode));

  // `lines` only limits a wrapping, ellipsizing label, which wraps up to that
  // many lines. Otherwise an ellipsized paragraph is one line (Pango's default
  // layout height of -1).
  const lineLimit = wrap && ellipsize !== "none" && lines > 0;
  // The label is a flex container (so it can center its text vertically) and
  // text-overflow doesn't apply to flex containers: an ellipsizing label puts
  // its text in a block that can shrink and draw the ellipsis.
  const ellipsizing = ellipsize !== "none" && !lineLimit;
  if (ellipsizing) {
    cssStyle.overflow = "hidden";
    cssStyle.whiteSpace = "pre";
  }

  if (widthChars > 0) {
    cssStyle.minWidth = `${widthChars}ch`;
  }

  let content: ReactNode = text;
  if (useMarkup) {
    const markup = renderMarkup(text, (link, key, children) => (
      <a
        key={key}
        className={link.className ? `gtk-link ${link.className}` : "gtk-link"}
        // An insensitive label's links take no input, like the label.
        href={disabled ? undefined : link.uri}
        target="_blank"
        rel="noopener noreferrer"
        // A link's title is its tooltip (gtk_label_query_tooltip()).
        title={link.title}
        data-visited={visited.has(link.uri) || undefined}
        data-disabled={disabled || undefined}
        style={disabled ? undefined : LINK_STYLE}
        onClick={(e: MouseEvent) => {
          // Like emit_activate_link(): a handler that returns true takes the
          // link instead of the default one, which opens it; either way the
          // link is visited.
          if (onActivateLink?.(link.uri) === true) e.preventDefault();
          setVisited((uris) => (uris.has(link.uri) ? uris : new Set(uris).add(link.uri)));
        }}
      >
        <span>{children}</span>
      </a>
    ));
    // A label with links has the .link class (gtk_label_set_markup_internal()).
    if (markup.hasLinks) classes.push("link");
    // One flex item, or the spaces around markup tags would collapse.
    content = markup.content === null ? null : <span>{markup.content}</span>;
  }

  if (ellipsizing) content = ellipsized(content, ellipsize, text);

  // max-width-chars only sets the natural width, to min(text, N chars)
  // (get_default_widths()). The text's block has that width as its max-width,
  // and a min-width of 100% (nothing while the label is measured) so it still
  // fills a wider label: GTK lays the text out at the label's allocation.
  // A wrapping label's width can also follow from its height, at the width
  // its parent allocates (layout.css uses it where GTK does).
  if (maxWidthChars > 0) {
    const vars = cssStyle as Record<string, string>;
    vars["--gtk-max-width-chars"] = `${Math.max(widthChars, maxWidthChars)}ch`;
    if (wrap) vars["--gtk-label-width-for-height"] = "calc-size(max-content, min(size, 100%))";
    content = (
      <span
        style={{
          display: "flex",
          justifyContent: cssStyle.justifyContent,
          minWidth: "100%",
          maxWidth: "var(--gtk-max-width-chars)",
          ...(lineLimit && lineClamp(lines)),
        }}
      >
        {content}
      </span>
    );
  } else if (lineLimit) {
    Object.assign(cssStyle, lineClamp(lines));
  }

  if (className) classes.push(className);

  return (
    <span
      ref={rootRef}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      tabIndex={focusable ? 0 : undefined}
      style={cssStyle}
      onMouseDown={(e) => {
        onMouseDown?.(e);
        if (focusable && e.button === 0 && document.activeElement !== e.currentTarget) {
          inClick.current = true;
        }
      }}
      onFocus={(e: FocusEvent<HTMLSpanElement>) => {
        onFocus?.(e);
        const fromClick = inClick.current;
        inClick.current = false;
        // gtk_label_grab_focus() selects the whole text (gtk-label-select-on-focus)
        // unless a click or one of the label's links focused it.
        const from = e.relatedTarget;
        if (
          focusable &&
          e.target === e.currentTarget &&
          !fromClick &&
          !(from instanceof Node && e.currentTarget.contains(from))
        ) {
          getSelection()?.selectAllChildren(e.currentTarget);
        }
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (focusable && e.target === e.currentTarget) selectionBinding(e);
      }}
      {...rest}
    >
      {content}
    </span>
  );
});

/**
 * GtkLabel's select-all (Ctrl+A, Ctrl+/) and unselect-all (Shift+Ctrl+A,
 * Ctrl+\) bindings, which keep to the label rather than the page.
 */
function selectionBinding(e: KeyboardEvent<HTMLSpanElement>) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const key = e.key.toLowerCase();
  const label = e.currentTarget;
  if (!e.shiftKey && (key === "a" || key === "/")) {
    getSelection()?.selectAllChildren(label);
  } else if ((e.shiftKey && key === "a") || key === "\\") {
    // move-cursor to the paragraph ends with a count of 0: the end of the text.
    getSelection()?.collapse(label, label.childNodes.length);
  } else {
    return;
  }
  e.preventDefault();
}

/** A GTK alignment (0 start, 0.5 center, 1 end) as a flex one; others take the nearest. */
function flexAlign(align: number): "flex-start" | "center" | "flex-end" {
  return align < 0.25 ? "flex-start" : align > 0.75 ? "flex-end" : "center";
}

/** The clamp draws the ellipsis at the end of its last line. */
function lineClamp(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

/**
 * A label's content ellipsized like PangoEllipsizeMode. CSS only ellipsizes at
 * a line's end: for "start" the text overflows a right-to-left block, which
 * clips it and draws the ellipsis on the left, and keeps its own direction in
 * an isolate. "middle" splits the text into two halves that shrink alike, the
 * first ellipsized at its end and the second clipped at its start. Markup,
 * which can't be split, and paragraphs ellipsize at the end in "middle" mode.
 */
function ellipsized(content: ReactNode, mode: GtkEllipsizeMode, text: string): ReactNode {
  if (mode === "start") {
    return (
      <span style={{ ...ELLIPSIS_STYLE, direction: "rtl" }}>
        <span style={ISOLATE_LTR}>{content}</span>
      </span>
    );
  }
  if (mode === "middle" && content === text && !text.includes("\n")) {
    const chars = Array.from(text);
    const half = Math.ceil(chars.length / 2);
    return (
      <span style={MIDDLE_STYLE}>
        <span style={{ ...ELLIPSIS_STYLE, flex: "1 1 auto" }}>{chars.slice(0, half).join("")}</span>
        <span
          style={{
            ...ELLIPSIS_STYLE,
            flex: "1 1 auto",
            textOverflow: CLIP_CLUSTERS,
            direction: "rtl",
          }}
        >
          <span style={ISOLATE_LTR}>{chars.slice(half).join("")}</span>
        </span>
      </span>
    );
  }
  return <span style={ELLIPSIS_STYLE}>{content}</span>;
}

const ELLIPSIS_STYLE: React.CSSProperties = {
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "pre",
};

// An empty string clips whole characters like Pango, where the browser
// supports it; others clip, the initial value.
const CLIP_CLUSTERS = '""';

const MIDDLE_STYLE: React.CSSProperties = { display: "flex", minWidth: 0, overflow: "hidden" };

const ISOLATE_LTR: React.CSSProperties = { direction: "ltr", unicodeBidi: "isolate" };

// GTK shows the pointer over a link (gtk_label_update_cursor()).
const LINK_STYLE: CSSProperties = { cursor: "pointer" };

interface LabelLink {
  uri: string;
  title?: string;
  className?: string;
}

// The tags parseMarkup() reads.
const TAG = /<(\/?)([\w-]+)((?:\s+[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;

/** A quoted attribute's value without its XML entities, or null if it has invalid ones. */
function attributeValue(quoted: string): string | null {
  const value = parseMarkup(quoted.slice(1, -1));
  return typeof value === "string" ? value : quoted.length === 2 ? "" : null;
}

/**
 * Pango markup with GtkLabel's `<a>` links. Like parse_uri_markup(), which
 * takes the links out before Pango parses the rest, it splits the markup at
 * the links, closing the tags open there and opening them again after, so
 * each part parses as markup of its own. Invalid markup shows nothing, with a
 * warning, as in gtk_label_set_markup_internal().
 */
function renderMarkup(
  markup: string,
  renderLink: (link: LabelLink, key: number, children: ReactNode) => ReactNode,
): { content: ReactNode; hasLinks: boolean } {
  const parts: { markup: string; link?: LabelLink }[] = [];
  const open: { name: string; tag: string }[] = [];
  let part: { markup: string; link?: LabelLink } = { markup: "" };
  const split = (link?: LabelLink) => {
    part.markup += [...open]
      .reverse()
      .map(({ name }) => `</${name}>`)
      .join("");
    parts.push(part);
    part = { markup: open.map(({ tag }) => tag).join(""), link };
  };
  const invalid = () => {
    console.warn(`Failed to set text '${markup}' from markup due to error parsing markup`);
    return { content: null, hasLinks: false };
  };

  let pos = 0;
  for (const match of markup.matchAll(TAG)) {
    const [tag, closing, name = "", attrs = "", selfClosing] = match;
    part.markup += markup.slice(pos, match.index);
    pos = match.index + tag.length;
    if (name !== "a") {
      part.markup += tag;
      if (closing) {
        if (open.at(-1)?.name === name) open.pop();
      } else if (!selfClosing) {
        open.push({ name, tag });
      }
    } else if (closing) {
      if (!part.link) return invalid();
      split();
    } else {
      // An <a> takes only href, title and class (start_element_handler()).
      if (part.link) return invalid();
      const link: Partial<LabelLink> = {};
      for (const [, key, quoted = ""] of attrs.matchAll(/([\w-]+)\s*=\s*("[^"]*"|'[^']*')/g)) {
        const value = attributeValue(quoted);
        if (value === null) return invalid();
        if (key === "href") link.uri = value;
        else if (key === "title") link.title = value;
        else if (key === "class") link.className = value;
        else return invalid();
      }
      if (link.uri === undefined) return invalid();
      if (!selfClosing) split(link as LabelLink);
    }
  }
  part.markup += markup.slice(pos);
  if (part.link) return invalid();
  parts.push(part);

  const content: ReactNode[] = [];
  for (const [i, { markup: partMarkup, link }] of parts.entries()) {
    const children = parseMarkup(partMarkup);
    if (children === null) return invalid();
    content.push(link ? renderLink(link, i, children) : <Fragment key={i}>{children}</Fragment>);
  }
  return { content, hasLinks: parts.some(({ link }) => link) };
}
