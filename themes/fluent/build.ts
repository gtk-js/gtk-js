// Builds the Fluent theme: a Windows 11 (WinUI 3 / Fluent 2) look for GTK 4
// and libadwaita. It's libadwaita's own stylesheet, compiled with the values
// in src/scss/_fluent-vars.scss and followed by the rules in
// src/scss/_fluent.scss, so it styles every widget libadwaita does.
//
// Two outputs:
// - dist/{light,dark,auto}.css: the web CSS gtk-js injects.
// - dist/gtk-4.0/gtk.css: the native GTK CSS, before the web transform. Copy
//   it to ~/.config/gtk-4.0/gtk.css to theme native GTK 4/libadwaita apps.
import { compileGtkCSS } from "@gtk-js/gtk-css/compile";
import { spawnSync } from "child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const upstreamDir = new URL("../../upstream/libadwaita/src/stylesheet", import.meta.url).pathname;
const srcDir = new URL("src/scss", import.meta.url).pathname;
const outDir = new URL("dist/", import.meta.url).pathname;
mkdirSync(join(outDir, "gtk-4.0"), { recursive: true });

// gtk-js's default font (reset.css), which GTK takes from gtk-font-name: the
// theme's, so `font: initial` resolves to it too. The line height is Pango's
// for Segoe UI at 14px (its ascent and descent rounded up: 20px), which is
// also Windows' Body line height.
const WEB_CSS = `
:where([data-gtk-provider]) {
  --gtk-font-family: "Segoe UI Variable Text", "Segoe UI", Selawik, "Noto Sans", "Open Sans", sans-serif;
  --gtk-font-size: 10.5pt;
  --gtk-line-height: 1.43;
}
`;

// libadwaita's SCSS sets its variables unconditionally, so they're overridden
// in a copy: _fluent-vars.scss goes after _colors.scss's variables (which
// _common.scss's own rules read) and after _common.scss's (which the widgets
// read), _fluent.scss at the end.
const work = mkdtempSync(join(tmpdir(), "gtk-js-fluent-"));
try {
  cpSync(upstreamDir, work, { recursive: true });
  cpSync(srcDir, work, { recursive: true });

  const patch = (file: string, from: string, to: string) => {
    const path = join(work, file);
    const text = readFileSync(path, "utf8");
    if (!text.includes(from)) throw new Error(`${file}: "${from}" not found; update build.ts`);
    writeFileSync(path, text.replace(from, to));
  };
  patch("_common.scss", "@import 'widgets';", "@import 'fluent-vars';\n@import 'widgets';");
  // Corners libadwaita derives from the button radius, negative at Windows' 4px.
  patch(
    "widgets/_buttons.scss",
    "border-radius: $button_radius - 4.5px;",
    "border-radius: max($button_radius - 4.5px, 0px);",
  );
  patch(
    "widgets/_buttons.scss",
    "border-radius: $button_radius - 5px;",
    "border-radius: max($button_radius - 5px, 0px);",
  );
  patch("default.scss", "@import 'colors';", "@import 'colors';\n@import 'fluent-vars';");
  patch("default.scss", "@import 'compat-colors';", "@import 'compat-colors';\n@import 'fluent';");

  const entry = join(work, "default.scss");

  const sassc = spawnSync("sassc", ["-t", "expanded", entry], { maxBuffer: 256 * 1024 * 1024 });
  if (sassc.status !== 0) throw new Error(`sassc failed:\n${sassc.stderr}`);
  writeFileSync(join(outDir, "gtk-4.0", "gtk.css"), sassc.stdout);
  // Its url()s are relative to it.
  cpSync(join(work, "assets"), join(outDir, "gtk-4.0", "assets"), { recursive: true });

  const variants = [
    { name: "light", scheme: "light" as const },
    { name: "dark", scheme: "dark" as const },
    { name: "auto", scheme: undefined },
  ];
  for (const { name, scheme } of variants) {
    const css = (await compileGtkCSS(entry, scheme ? { scheme } : undefined)) + WEB_CSS;
    writeFileSync(`${outDir}${name}.css`, css);
    process.stdout.write(`  ${name}: ${css.length}b\n`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log("Built the Fluent theme.");
