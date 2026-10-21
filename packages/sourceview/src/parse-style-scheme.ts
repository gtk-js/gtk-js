/**
 * Parses a GtkSourceView style scheme file (`upstream/gtksourceview/data/styles/*.xml`),
 * like _gtk_source_style_scheme_new_from_file(). `build.ts` uses it to generate
 * `schemes.ts`; it isn't part of the package's exports.
 */

import { fixStyleColors, parseSchemeColor } from "./style-scheme.ts";
import type {
  GtkSourceStyle,
  GtkSourceStyleSchemeData,
  GtkSourceUnderline,
} from "./style-scheme-data.ts";

interface XmlElement {
  name: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  text: string;
}

const ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return ENTITIES[name] ?? entity;
  });
}

/** A small XML reader: elements, attributes, text, comments and declarations. */
function parseXml(xml: string): XmlElement {
  const root: XmlElement = { name: "", attributes: {}, children: [], text: "" };
  const stack = [root];
  const tag =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!(?!--)[^>]*>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let last = 0;
  for (let match = tag.exec(xml); match; match = tag.exec(xml)) {
    const parent = stack[stack.length - 1]!;
    parent.text += decode(xml.slice(last, match.index));
    last = tag.lastIndex;
    const [whole, cdata, closing, name, attrs, selfClosing] = match;
    if (cdata !== undefined) {
      parent.text += cdata;
      continue;
    }
    if (name === undefined || whole.startsWith("<!") || whole.startsWith("<?")) continue;
    if (closing) {
      if (parent.name !== name) throw new Error(`unexpected </${name}>`);
      stack.pop();
      continue;
    }
    const element: XmlElement = { name, attributes: {}, children: [], text: "" };
    for (const attr of (attrs ?? "").matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      element.attributes[attr[1]!] = decode(attr[2] ?? attr[3] ?? "");
    }
    parent.children.push(element);
    if (!selfClosing) stack.push(element);
  }
  if (stack.length !== 1) throw new Error(`unclosed <${stack[stack.length - 1]!.name}>`);
  const [element, ...rest] = root.children;
  if (!element || rest.length) throw new Error("expected one root element");
  return element;
}

/** xmlNodeGetContent(): the text of an element and its descendants. */
function content(element: XmlElement): string {
  return element.text + element.children.map(content).join("");
}

/** parse_bool() */
function parseBool(value: string): boolean {
  return ["true", "yes", "1"].includes(value.toLowerCase());
}

const UNDERLINES: readonly GtkSourceUnderline[] = [
  "none",
  "single",
  "double",
  "low",
  "error",
  "single-line",
  "double-line",
  "error-line",
];

/** PangoWeight's nicks. */
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

const STYLE_ATTRIBUTES = [
  "foreground",
  "background",
  "line-background",
  "bold",
  "italic",
  "strikethrough",
  "underline",
  "underline-color",
  "scale",
  "weight",
];

/**
 * parse_style(). A `use-style` copies a style the file defined before this
 * one, its colors resolved against the file's own palette: the parent scheme
 * isn't known yet while a file is parsed.
 */
function parseStyle(
  element: XmlElement,
  styles: Record<string, GtkSourceStyle>,
  colors: Record<string, string>,
): [string, GtkSourceStyle] {
  const a = element.attributes;
  const name = a.name;
  if (name === undefined) throw new Error("name attribute missing");

  if (a["use-style"] !== undefined) {
    const used = styles[a["use-style"]];
    if (!used) throw new Error(`in style '${name}': unknown style '${a["use-style"]}'`);
    if (STYLE_ATTRIBUTES.some((attr) => a[attr] !== undefined)) {
      throw new Error(`in style '${name}': style attributes used along with use-style`);
    }
    const lookup = (color: string) =>
      color.startsWith("#") ? parseSchemeColor(color) : (colors[color] ?? null);
    return [name, fixStyleColors(used, lookup)];
  }

  const style: GtkSourceStyle = {};
  if (a.foreground !== undefined) style.foreground = a.foreground;
  if (a.background !== undefined) style.background = a.background;
  if (a["line-background"] !== undefined) style.lineBackground = a["line-background"];
  if (a.bold !== undefined) style.bold = parseBool(a.bold);
  if (a.italic !== undefined) style.italic = parseBool(a.italic);
  if (a.strikethrough !== undefined) style.strikethrough = parseBool(a.strikethrough);
  if (a.underline !== undefined) {
    // Up until 3.16 underline was a boolean: "true" is "single".
    const underline = parseBool(a.underline) ? "single" : a.underline.toLowerCase();
    if ((UNDERLINES as readonly string[]).includes(underline)) {
      style.underline = underline as GtkSourceUnderline;
    }
  }
  if (a["underline-color"] !== undefined) style.underlineColor = a["underline-color"];
  if (a.scale !== undefined) style.scale = a.scale;
  if (a.weight !== undefined) {
    const nick = a.weight.toLowerCase();
    const weight = WEIGHTS[nick] ?? (/^[0-9]/.test(nick) ? parseInt(nick, 10) : undefined);
    if (weight !== undefined) {
      // A weight replaces bold.
      style.weight = weight;
      delete style.bold;
    }
  }
  return [name, style];
}

/**
 * Reads a style scheme file into scheme data, or throws what
 * parse_style_scheme_element() reports.
 */
export function parseStyleScheme(xml: string): GtkSourceStyleSchemeData {
  const root = parseXml(xml);
  if (root.name !== "style-scheme") throw new Error(`unexpected element '${root.name}'`);
  const { version, id, _name, name, "parent-scheme": parentScheme } = root.attributes;
  if (version === undefined) throw new Error("missing 'version' attribute");
  if (version !== "1.0") throw new Error(`unsupported version '${version}'`);
  if (id === undefined) throw new Error("missing 'id' attribute");
  const schemeName = _name ?? name;
  if (schemeName === undefined) throw new Error("missing 'name' attribute");

  const scheme: {
    -readonly [K in keyof GtkSourceStyleSchemeData]: GtkSourceStyleSchemeData[K];
  } = { id, name: schemeName, colors: {}, styles: {} };
  if (parentScheme !== undefined) scheme.parentScheme = parentScheme;
  const colors: Record<string, string> = {};
  const styles: Record<string, GtkSourceStyle> = {};
  const authors: string[] = [];
  const metadata: Record<string, string> = {};

  for (const child of root.children) {
    switch (child.name) {
      case "style": {
        const [styleName, style] = parseStyle(child, styles, colors);
        styles[styleName] = style;
        break;
      }
      case "color": {
        // parse_color()
        const { name: colorName, value } = child.attributes;
        if (!colorName) throw new Error("name attribute missing in 'color' tag");
        if (value === undefined) throw new Error("value attribute missing in 'color' tag");
        if (value[0] !== "#" || value.length < 2) {
          throw new Error("value in 'color' tag is not of the form '#RGB' or '#name'");
        }
        if (colors[colorName] !== undefined) throw new Error(`duplicated color '${colorName}'`);
        colors[colorName] = value;
        break;
      }
      case "author":
        authors.push(content(child));
        break;
      case "description":
      case "_description":
        scheme.description = content(child);
        break;
      case "metadata":
        for (const property of child.children) {
          if (property.name === "property" && property.attributes.name !== undefined) {
            metadata[property.attributes.name] = content(property);
          }
        }
        break;
      default:
        throw new Error(`unknown node '${child.name}'`);
    }
  }

  scheme.colors = colors;
  scheme.styles = styles;
  if (authors.length) scheme.authors = authors;
  if (Object.keys(metadata).length) scheme.metadata = metadata;
  return scheme;
}
