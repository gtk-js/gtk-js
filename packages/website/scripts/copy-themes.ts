// Copies the theme packages' stylesheets to public/themes/<theme>/, where the
// docs site links them (components/gtk-demo/theme-stylesheet.ts) instead of
// putting the theme's CSS in every page.
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../public/themes/", import.meta.url));
rmSync(out, { recursive: true, force: true });
for (const theme of ["adwaita", "fluent", "mactahoe", "whitesur"]) {
  // The package's entry is dist/index.js, next to its CSS.
  const dist = dirname(fileURLToPath(import.meta.resolve(`@gtk-js/theme-${theme}`)));
  mkdirSync(join(out, theme), { recursive: true });
  for (const file of readdirSync(dist)) {
    // auto.css follows prefers-color-scheme; the site links the scheme's own file.
    if (file.endsWith(".css") && file !== "auto.css")
      copyFileSync(join(dist, file), join(out, theme, file));
  }
}
