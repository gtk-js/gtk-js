import { compileGtkCSS } from "@gtk-js/gtk-css/compile";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "fs";

const upstreamDir = new URL("../../upstream/fluent-gtk-theme/src", import.meta.url).pathname;
const outDir = new URL("dist/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const sassDir = `${upstreamDir}/_sass`;

// The url()s are relative to gtk-4.0/, where install.sh copies gtk/assets as
// assets/ and gtk/scalable into it as assets/scalable/.
const assetMap = new Map<string, string>();
for (const [dir, prefix] of [
  [`${upstreamDir}/gtk/assets`, "assets/"],
  [`${upstreamDir}/gtk/scalable`, "assets/scalable/"],
]) {
  for (const name of readdirSync(dir)) assetMap.set(prefix + name, `${dir}/${name}`);
}

const schemes = ["light", "dark"] as const;
const titlebuttons = ["circular", "square"] as const;
const windows = ["default", "round"] as const;

// Accent hex baked in by the SCSS theme() function for $theme: 'default'
const ACCENT_HEX: Record<"light" | "dark", { hex: string; r: number; g: number; b: number }> = {
  light: { hex: "#1A73E8", r: 26, g: 115, b: 232 },
  dark: { hex: "#3281EA", r: 50, g: 129, b: 234 },
};

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
        let css = await compileGtkCSS(scssEntry, { scheme, assetMap });
        css = replaceAccentWithVar(css, scheme);

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
