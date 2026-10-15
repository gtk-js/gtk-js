/**
 * Weigh the GTK node classes in gtk-js's own CSS like the theme does.
 *
 * The theme pipeline writes GTK node names with a type selector's specificity
 * (`row` → `:where(.gtk-row):not(_)`, see gtkNodeSelector() in @gtk-js/gtk-css),
 * as GTK weighs them. Rules here that style the same nodes get the same
 * treatment, so they compare with the theme's rules as before. The layout
 * managers' classes (.gtk-box-layout, .gtk-bin-layout, .gtk-center-layout*)
 * aren't GTK nodes and keep their weight.
 */
const NODE_CLASS_RE = /(?<![\w-])\.(gtk-(?!(?:box|bin|center)-layout)[\w-]+)/g;
const PRELUDE_RE = /(^|[{};])([^{};@]*)\{/g;

export function weighGtkNodeClasses(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(
      PRELUDE_RE,
      (_, start: string, prelude: string) =>
        `${start}${prelude.replace(NODE_CLASS_RE, ":where(.$1):not(_)")}{`,
    );
}
