import { mkdirSync, writeFileSync } from "node:fs";
import { compileGtkCSS } from "@gtk-js/gtk-css/compile";

const css = await compileGtkCSS(
  new URL("../../upstream/gtk/gtk/theme/Default/Default-light.scss", import.meta.url).pathname,
);

mkdirSync(new URL("dist/", import.meta.url).pathname, { recursive: true });
writeFileSync(new URL("dist/gtk4.css", import.meta.url).pathname, css);
console.log(`Built gtk4.css (${css.length} bytes)`);
