import { mkdirSync, writeFileSync } from "node:fs";
import { compileGtkCSS } from "@gtk-js/gtk-css/compile";

const css = await compileGtkCSS(
  new URL("../../upstream/libadwaita/src/stylesheet/default.scss", import.meta.url).pathname,
);

mkdirSync(new URL("dist/", import.meta.url).pathname, { recursive: true });
writeFileSync(new URL("dist/adwaita.css", import.meta.url).pathname, css);
console.log(`Built adwaita.css (${css.length} bytes)`);
