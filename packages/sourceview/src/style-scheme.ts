import type { GtkSourceStyle, GtkSourceStyleSchemeData } from "./style-scheme-data.ts";

/** The colors fix_style_colors() resolves. */
const COLOR_FIELDS = ["background", "foreground", "lineBackground", "underlineColor"] as const;

/**
 * Whether `color` is one gdk_rgba_parse() reads: a CSS color keyword, a
 * hex color or an rgb()/rgba()/hsl()/hsla() function.
 */
function isColor(color: string): boolean {
  return (
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ||
    /^[a-z]+$/i.test(color) ||
    /^(?:rgba?|hsla?)\([^()]*\)$/i.test(color.trim())
  );
}

/**
 * A `#`-prefixed color as color_parse() reads it: what follows the `#` when
 * that's a color (`#red`, `#rgba(…)`), else the whole string (`#3584e4`).
 */
export function parseSchemeColor(color: string): string | null {
  if (!color.startsWith("#")) return isColor(color) ? color : null;
  const rest = color.slice(1);
  // gdk_rgba_parse() reads `3584e4` as no color: hex needs its `#`.
  if (isColor(rest) && !/^[0-9a-f]+$/i.test(rest)) return rest;
  return isColor(color) ? color : null;
}

/**
 * A style's color as get_color_by_name() resolves it: a `#`-prefixed color,
 * or a palette color of the scheme or one of its parents.
 */
function colorByName(scheme: GtkSourceStyleScheme | null, name: string): string | null {
  if (name.startsWith("#")) return parseSchemeColor(name);
  for (let s = scheme; s; s = s.parent) {
    const color = s.data.colors[name];
    // Palette values are `#`-prefixed colors too (parse_color()).
    if (color !== undefined) return parseSchemeColor(color);
  }
  return null;
}

/**
 * Resolves a defined style's colors through `lookup`, dropping any that don't
 * resolve, like fix_style_colors().
 */
export function fixStyleColors(
  style: GtkSourceStyle,
  lookup: (name: string) => string | null,
): GtkSourceStyle {
  const fixed: GtkSourceStyle = { ...style };
  for (const field of COLOR_FIELDS) {
    const name = style[field];
    if (name === undefined) continue;
    const color = lookup(name);
    if (color === null) delete fixed[field];
    else fixed[field] = color;
  }
  return fixed;
}

/**
 * GtkSourceStyleScheme — the styles text in a GtkSourceView is drawn with:
 * the text's colors, the selection, cursor, current line, line numbers and
 * right margin, and the syntax highlighting styles (`def:comment`, `c:printf`, …).
 *
 * A scheme looks up a style it doesn't define in its parent scheme
 * (`parent-scheme`), and a palette color its parent's palette.
 *
 * @see https://gnome.pages.gitlab.gnome.org/gtksourceview/gtksourceview5/class.StyleScheme.html
 */
export class GtkSourceStyleScheme {
  readonly data: GtkSourceStyleSchemeData;
  readonly parent: GtkSourceStyleScheme | null;
  readonly #cache = new Map<string, GtkSourceStyle | null>();

  constructor(data: GtkSourceStyleSchemeData, parent: GtkSourceStyleScheme | null = null) {
    this.data = data;
    this.parent = parent;
  }

  /** A unique id, how a GtkSourceStyleSchemeManager finds the scheme. */
  get id(): string {
    return this.data.id;
  }

  /** The name to show the user. */
  get name(): string {
    return this.data.name;
  }

  get description(): string | null {
    return this.data.description ?? null;
  }

  get authors(): readonly string[] | null {
    return this.data.authors ?? null;
  }

  /** A `<metadata>` property, e.g. `variant` ("light" or "dark") or `dark-variant`. */
  getMetadata(name: string): string | null {
    return this.data.metadata?.[name] ?? null;
  }

  /**
   * The style with this id, its colors resolved to CSS colors, or null if
   * neither the scheme nor its parents define it, like
   * gtk_source_style_scheme_get_style(). A missing `def:net-address` falls
   * back to `def:underlined`, the style URLs used to have.
   */
  getStyle(styleId: string): GtkSourceStyle | null {
    const style = this.#getStyle(styleId);
    if (style === null && styleId === "def:net-address") return this.#getStyle("def:underlined");
    return style;
  }

  /** gtk_source_style_scheme_get_style_internal() */
  #getStyle(styleId: string): GtkSourceStyle | null {
    const cached = this.#cache.get(styleId);
    if (cached !== undefined) return cached;
    const defined = this.data.styles[styleId];
    const style = defined
      ? fixStyleColors(defined, (name) => colorByName(this, name))
      : (this.parent?.getStyle(styleId) ?? null);
    this.#cache.set(styleId, style);
    return style;
  }
}

/**
 * The style scheme a buffer has until one is set
 * (_gtk_source_style_scheme_get_default(): DEFAULT_STYLE_SCHEME).
 */
export const DEFAULT_STYLE_SCHEME = "classic";

/**
 * GtkSourceStyleSchemeManager — finds style schemes by id. A scheme whose
 * parent scheme is missing, or that inherits from itself, isn't loaded, and of
 * two schemes with one id the first one is, like reload_if_needed().
 *
 * @see https://gnome.pages.gitlab.gnome.org/gtksourceview/gtksourceview5/class.StyleSchemeManager.html
 */
export class GtkSourceStyleSchemeManager {
  readonly #schemes = new Map<string, GtkSourceStyleScheme>();
  readonly #ids: readonly string[];

  constructor(schemes: Iterable<GtkSourceStyleSchemeData>) {
    const data = new Map<string, GtkSourceStyleSchemeData>();
    for (const scheme of schemes) if (!data.has(scheme.id)) data.set(scheme.id, scheme);

    // build_reference_chain() / check_parents()
    const invalid = new Set<string>();
    for (const scheme of data.values()) {
      const chain = [scheme.id];
      for (let parent = scheme.parentScheme; parent !== undefined; ) {
        const parentData = data.get(parent);
        if (!parentData || chain.includes(parent) || invalid.has(parent)) {
          for (const id of chain) invalid.add(id);
          if (parentData) invalid.add(parent);
          break;
        }
        chain.push(parent);
        parent = parentData.parentScheme;
      }
    }

    const load = (id: string): GtkSourceStyleScheme => {
      const loaded = this.#schemes.get(id);
      if (loaded) return loaded;
      const scheme = data.get(id)!;
      const parent = scheme.parentScheme === undefined ? null : load(scheme.parentScheme);
      const created = new GtkSourceStyleScheme(scheme, parent);
      this.#schemes.set(id, created);
      return created;
    };
    for (const id of data.keys()) if (!invalid.has(id)) load(id);

    // Sorted by name (schemes_compare()).
    this.#ids = [...this.#schemes.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((scheme) => scheme.id);
  }

  /** The ids of the schemes, sorted by name. */
  getSchemeIds(): readonly string[] {
    return this.#ids;
  }

  /** The scheme with this id, or null. */
  getScheme(id: string): GtkSourceStyleScheme | null {
    return this.#schemes.get(id) ?? null;
  }
}
