/**
 * Style scheme data, as GtkSourceView's style scheme files define it
 * (see the style scheme reference, `upstream/gtksourceview/docs/style-reference.md`).
 * `build.ts` generates `schemes.ts` from the bundled schemes in this shape.
 */

/** Pango underline styles a style's `underline` takes (PangoUnderline's nicks). */
export type GtkSourceUnderline =
  | "none"
  | "single"
  | "double"
  | "low"
  | "error"
  | "single-line"
  | "double-line"
  | "error-line";

/**
 * A style (GtkSourceStyle): how text with the style's id looks. Unset fields
 * leave the text as it is. In a scheme file's data, colors are either
 * palette names or `#`-prefixed colors (`#3584e4`, `#red`, `#rgba(…)`); a
 * style a scheme gives out has them resolved to CSS colors.
 */
export interface GtkSourceStyle {
  foreground?: string;
  background?: string;
  /** The whole line's background (a GtkTextTag's paragraph-background). */
  lineBackground?: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: GtkSourceUnderline;
  underlineColor?: string;
  /** A Pango scale name (`large`, `x-small`, …) or a factor (`1.2`). */
  scale?: string;
  /** A font weight (100–1000), which overrides `bold`. */
  weight?: number;
}

/** A style scheme file's contents (GtkSourceStyleScheme before it's loaded). */
export interface GtkSourceStyleSchemeData {
  id: string;
  name: string;
  description?: string;
  authors?: readonly string[];
  /** The scheme it inherits styles and palette colors from (`parent-scheme`). */
  parentScheme?: string;
  /** `<metadata>` properties, e.g. `variant`, `dark-variant` and `light-variant`. */
  metadata?: Readonly<Record<string, string>>;
  /** The palette: `<color name value>`, each value a `#`-prefixed color. */
  colors: Readonly<Record<string, string>>;
  /** The styles by id, colors unresolved (or resolved already, for a `use-style`). */
  styles: Readonly<Record<string, GtkSourceStyle>>;
}
