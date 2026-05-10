import { compileGtkCSS } from "@gtk-js/gtk-css/compile";
import { mkdirSync, unlinkSync, writeFileSync } from "fs";

const upstreamDir = new URL("../../upstream/fluent-gtk-theme/src", import.meta.url).pathname;
const outDir = new URL("dist/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const sassDir = `${upstreamDir}/_sass`;

const schemes = ["light", "dark"] as const;
const titlebuttons = ["circular", "square"] as const;
const windows = ["default", "round"] as const;

// Accent hex baked in by the SCSS theme() function for $theme: 'default'
const ACCENT_HEX: Record<"light" | "dark", { hex: string; r: number; g: number; b: number }> = {
  light: { hex: "#1A73E8", r: 26, g: 115, b: 232 },
  dark: { hex: "#3281EA", r: 50, g: 129, b: 234 },
};

/**
 * Adjust .gtk-switch min-width/min-height to match native GTK layout manager.
 *
 * Native GTK computes: switch_width = 2 × slider_measured_width (content + margin).
 * The upstream SCSS sets switch min-width to $small-size (22px), but the native
 * layout manager overrides this to 2 × (12px slider + 5px margin × 2) = 44px.
 * The switch min-height is slider_measured_height = 12px + 5px × 2 = 22px.
 */
function fixSwitchLayout(css: string): string {
  // Match the first .gtk-switch { ... } block and fix min-width inside it.
  // The compiled CSS has exactly one `.gtk-switch {` rule with min-width: 22px.
  return css.replace(
    /(\.gtk-switch\s*\{[^}]*?)min-width:\s*22px/,
    "$1min-width: 44px;\n  min-height: 22px",
  );
}

/**
 * Post-process compiled CSS to replace the baked-in accent hex and all
 * rgba(R,G,B,A) derived forms with CSS custom property references.
 * This allows the accent color to be overridden at runtime.
 */
function replaceAccentWithVar(css: string, scheme: "light" | "dark"): string {
  const { hex, r, g, b } = ACCENT_HEX[scheme];

  // Replace bare hex (case-insensitive)
  css = css.replace(new RegExp(hex, "gi"), "var(--fluent-accent)");

  // Replace rgba(R, G, B, A) derived forms → color-mix(in srgb, var(--fluent-accent) A%, transparent)
  css = css.replace(
    new RegExp(`rgba\\(${r},\\s*${g},\\s*${b},\\s*([\\d.]+)\\)`, "g"),
    (_, a: string) =>
      `color-mix(in srgb, var(--fluent-accent) ${Math.round(parseFloat(a) * 100)}%, transparent)`,
  );

  return css;
}

const results: Record<string, string> = {};

for (const scheme of schemes) {
  const scssEntry = `${upstreamDir}/gtk/4.0/gtk-${scheme === "light" ? "Light" : "Dark"}.scss`;

  for (const titlebutton of titlebuttons) {
    for (const win of windows) {
      const tweaksTempContent = `
$panel_style: 'compact';
$opacity: 'default';
$window: '${win}';
$theme: 'default';
$blur: 'false';
$outline: 'true';
$titlebutton: '${titlebutton}';
`;
      writeFileSync(`${sassDir}/_tweaks-temp.scss`, tweaksTempContent);

      try {
        let css = await compileGtkCSS(scssEntry, { scheme });
        css = replaceAccentWithVar(css, scheme);
        css = fixSwitchLayout(css);

        const key = `${scheme}_${titlebutton}_${win}`;
        results[key] = css;
        process.stdout.write(`  ${key}: ${css.length}b\n`);
      } finally {
        try {
          unlinkSync(`${sassDir}/_tweaks-temp.scss`);
        } catch {}
      }
    }
  }
}

// Write individual CSS files
for (const [key, css] of Object.entries(results)) {
  writeFileSync(`${outDir}${key}.css`, css);
}

console.log(`Built ${Object.keys(results).length} Fluent variants.`);
