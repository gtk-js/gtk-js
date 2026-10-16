import { compileGtkCSS } from "@gtk-js/gtk-css/compile";
import { mkdirSync, writeFileSync } from "fs";

const scssPath = new URL("../../upstream/libadwaita/src/stylesheet/default.scss", import.meta.url)
  .pathname;

const outDir = new URL("dist/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const variants = [
  { name: "light", scheme: "light" as const },
  { name: "dark", scheme: "dark" as const },
  { name: "auto", scheme: undefined },
] as const;

for (const { name, scheme } of variants) {
  const css = await compileGtkCSS(scssPath, scheme ? { scheme } : undefined);
  writeFileSync(`${outDir}${name}.css`, css);
  process.stdout.write(`  ${name}: ${css.length}b\n`);
}

console.log(`Built ${variants.length} Adwaita variants.`);
