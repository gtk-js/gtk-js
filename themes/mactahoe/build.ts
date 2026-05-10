import { compileGtkCSS } from "@gtk-js/gtk-css/compile";
import { XMLParser } from "fast-xml-parser";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";

const upstreamDir = new URL("../../upstream/mactahoe-gtk-theme/src", import.meta.url).pathname;

const outDir = new URL("dist/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const sassDir = `${upstreamDir}/sass`;

// Parse gtk.gresource.xml to build a map of virtual CSS url() paths → physical file paths.
// The gresource XML lists paths relative to gtk-4.0/, and make_gresource_xml.sh maps them:
//   assets/         → src/assets/gtk/common-assets/assets/
//   windows-assets/ → src/assets/gtk/windows-assets/titlebutton/
const gresourceXml = readFileSync(`${upstreamDir}/main/gtk-4.0/gtk.gresource.xml`, "utf8");
const parsed = new XMLParser({ isArray: () => true }).parse(gresourceXml);
const assetMap = new Map<string, string>();
const files: string[] = parsed?.gresources?.[0]?.gresource?.[0]?.file ?? [];
for (const virtualPath of files) {
  if (!virtualPath.endsWith(".png")) continue;
  const filename = virtualPath.split("/").pop()!;
  let physicalPath: string;
  if (virtualPath.startsWith("windows-assets/")) {
    physicalPath = `${upstreamDir}/assets/gtk/windows-assets/titlebutton/${filename}`;
  } else if (virtualPath.startsWith("assets/")) {
    physicalPath = `${upstreamDir}/assets/gtk/common-assets/assets/${filename}`;
  } else {
    continue;
  }
  assetMap.set(virtualPath, physicalPath);
}

const accents = ["default"] as const;
const schemes = ["light", "dark"] as const;

const themeOptionsContent = `
$sidebar_size: 200px;
$nautilus_style: 'stable';
$panel_style: 'default';
$panel_opacity: 0.15;
$showapps_button: 'bigsur';
$panel_size: 'default';
$font_size: 'normal';
$activities: 'default';
$panel_font: 'white';
$max_window_style: 'square';
$monterey: 'false';
$darker: 'false';
$blur: 'false';
$desktop: 'default';
$scale: 'default';
$shell_version: 'old';
$scaling_factor: '2';
$menu_shadow: 'default';
`;

const results: Record<string, string> = {};

for (const scheme of schemes) {
  const scssEntry = `${upstreamDir}/main/gtk-4.0/gtk-${scheme === "light" ? "Light" : "Dark"}.scss`;

  for (const accent of accents) {
    const themeValue = accent === "default" ? "default" : accent;

    const gtkBaseContent = `
$laptop: 'true';
$trans: 'false';
$theme: '${themeValue}';
$scheme: 'standard';
$gnome_version: 'old';
$accent_type: 'default';
`;

    writeFileSync(`${sassDir}/_theme-options-temp.scss`, themeOptionsContent);
    writeFileSync(`${sassDir}/_gtk-base-temp.scss`, gtkBaseContent);

    try {
      const css = await compileGtkCSS(scssEntry, { scheme, assetMap });
      const key = `${scheme}_${accent}`;
      results[key] = css;
      process.stdout.write(`  ${key}: ${css.length}b\n`);
    } finally {
      try {
        unlinkSync(`${sassDir}/_theme-options-temp.scss`);
      } catch {}
      try {
        unlinkSync(`${sassDir}/_gtk-base-temp.scss`);
      } catch {}
    }
  }
}

// Write individual CSS files
for (const [key, css] of Object.entries(results)) {
  writeFileSync(`${outDir}${key}.css`, css);
}

console.log(`Built ${Object.keys(results).length} MacTahoe variants.`);
