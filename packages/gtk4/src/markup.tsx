import { type CSSProperties, createElement, type ReactNode } from "react";
import { stripMnemonic } from "./mnemonic.tsx";

const has = (table: object, key: string) => Object.hasOwn(table, key);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** GMarkup's unescaping: every `&` starts an entity, or the markup is invalid (null). */
function unescape(text: string): string | null {
  let out = "";
  let start = 0;
  for (let amp = text.indexOf("&"); amp >= 0; amp = text.indexOf("&", start)) {
    const entity = /^&(?:(amp|lt|gt|quot|apos)|#(\d+)|#x([\da-fA-F]+));/.exec(text.slice(amp));
    const code = entity?.[2] ? Number(entity[2]) : entity?.[3] ? parseInt(entity[3], 16) : 0;
    if (!entity || code > 0x10ffff) return null;
    out += text.slice(start, amp) + (entity[1] ? ENTITIES[entity[1]] : String.fromCodePoint(code));
    start = amp + entity[0].length;
  }
  return out + text.slice(start);
}

// Pango's convenience tags (pango-markup.c).
const TAGS: Record<string, CSSProperties> = {
  b: { fontWeight: "bold" },
  big: { fontSize: "larger" },
  i: { fontStyle: "italic" },
  s: { textDecorationLine: "line-through" },
  small: { fontSize: "smaller" },
  sub: { verticalAlign: "sub", fontSize: "smaller" },
  sup: { verticalAlign: "super", fontSize: "smaller" },
  tt: { fontFamily: "monospace" },
  u: { textDecorationLine: "underline" },
  span: {},
};

const WEIGHTS: Record<string, number> = {
  thin: 100,
  ultralight: 200,
  light: 300,
  semilight: 350,
  book: 380,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  ultrabold: 800,
  heavy: 900,
  ultraheavy: 1000,
};

// Pango's size keywords scale the base size by powers of 1.2.
const SIZES: Record<string, number> = {
  "xx-small": 1 / 1.2 ** 3,
  "x-small": 1 / 1.2 ** 2,
  small: 1 / 1.2,
  medium: 1,
  large: 1.2,
  "x-large": 1.2 ** 2,
  "xx-large": 1.2 ** 3,
};

function fontSize(value: string): string | undefined {
  if (value === "smaller" || value === "larger") return value;
  if (has(SIZES, value)) return `${SIZES[value]}em`;
  // A number is in 1024ths of a point; Pango also takes points and percentages.
  if (/^\d+$/.test(value)) return `${Number(value) / 1024}pt`;
  if (/^\d+(\.\d+)?(pt|%)$/.test(value)) return value;
  return undefined;
}

/** The style of a <span>'s attributes; attributes the web can't show are ignored. */
function spanStyle(attrs: Record<string, string>): CSSProperties {
  const style: CSSProperties = {};
  const lines: string[] = [];
  for (const [name, value] of Object.entries(attrs)) {
    switch (name) {
      case "font_family":
      case "face":
        style.fontFamily = value;
        break;
      case "font_size":
      case "size":
        style.fontSize = fontSize(value);
        break;
      case "font_style":
      case "style":
        style.fontStyle = value;
        break;
      case "font_weight":
      case "weight":
        style.fontWeight = has(WEIGHTS, value) ? WEIGHTS[value] : Number(value) || undefined;
        break;
      case "font_variant":
      case "variant":
        style.fontVariantCaps = value.replace(
          "smallcaps",
          "small-caps",
        ) as CSSProperties["fontVariantCaps"];
        break;
      case "foreground":
      case "fgcolor":
      case "color":
        style.color = value;
        break;
      case "background":
      case "bgcolor":
        style.backgroundColor = value;
        break;
      case "underline":
        if (value !== "none") {
          lines.push("underline");
          if (value === "double") style.textDecorationStyle = "double";
          if (value === "error") style.textDecorationStyle = "wavy";
          if (value === "low") style.textUnderlinePosition = "under";
        }
        break;
      case "strikethrough":
        if (value === "true") lines.push("line-through");
        break;
      case "underline_color":
      case "strikethrough_color":
        style.textDecorationColor = value;
        break;
      case "letter_spacing":
        style.letterSpacing = `${Number(value) / 1024}pt`;
        break;
    }
  }
  if (lines.length > 0) style.textDecorationLine = lines.join(" ");
  return style;
}

interface Span {
  tag: string;
  style: CSSProperties;
  children: ReactNode[];
  parent?: Span;
}

/**
 * Pango markup (pango_parse_markup()) as React elements, never as HTML: the
 * tags `<b> <big> <i> <s> <small> <sub> <sup> <tt> <u>` and `<span>` with its
 * font and color attributes, and the XML entities. Returns null when the
 * markup doesn't parse.
 */
export function parseMarkup(markup: string, useUnderline = false): ReactNode | null {
  const root: Span = { tag: "", style: {}, children: [] };
  let current = root;
  const close = (span: Span) => {
    const parent = span.parent!;
    parent.children.push(
      createElement("span", { key: parent.children.length, style: span.style }, ...span.children),
    );
    return parent;
  };
  const tag = /<(\/?)([\w-]+)((?:\s+[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
  let pos = 0;
  while (pos < markup.length) {
    const lt = markup.indexOf("<", pos);
    const end = lt < 0 ? markup.length : lt;
    if (end > pos) {
      const text = unescape(markup.slice(pos, end));
      if (text === null) return null;
      current.children.push(useUnderline ? stripMnemonic(text) : text);
    }
    if (lt < 0) break;
    tag.lastIndex = lt;
    const match = tag.exec(markup);
    if (!match) return null;
    pos = tag.lastIndex;
    const [, closing, name = "", attrText = "", selfClosing] = match;
    if (closing) {
      if (current === root || current.tag !== name || attrText || selfClosing) return null;
      current = close(current);
      continue;
    }
    if (!has(TAGS, name)) return null;
    const attrs: Record<string, string> = {};
    for (const [, key = "", quoted = ""] of attrText.matchAll(
      /([\w-]+)\s*=\s*("[^"]*"|'[^']*')/g,
    )) {
      const value = unescape(quoted.slice(1, -1));
      if (value === null) return null;
      attrs[key] = value;
    }
    const style = { ...TAGS[name], ...(name === "span" ? spanStyle(attrs) : {}) };
    current = { tag: name, style, children: [], parent: current };
    if (selfClosing) current = close(current);
  }
  if (current !== root) return null;
  return root.children.length === 1 ? root.children[0] : root.children;
}

/**
 * A label's text, like gtk_label_recalculate(): Pango markup when `useMarkup`,
 * and with `useUnderline` an underscore marks a mnemonic instead of showing.
 * Invalid markup shows nothing, with a warning, like
 * gtk_label_set_markup_internal().
 */
export function labelText(text: string, useMarkup: boolean, useUnderline = false): ReactNode {
  if (!useMarkup) return useUnderline ? stripMnemonic(text) : text;
  const content = parseMarkup(text, useUnderline);
  if (content === null) {
    console.warn(`Failed to set text '${text}' from markup due to error parsing markup`);
  }
  return content;
}
