import { existsSync, readFileSync } from "node:fs";
import { buildIconPackage } from "@gtk-js/icon-helpers/build";

const theme = new URL("../../upstream/adwaita-icon-theme/", import.meta.url).pathname;

// GtkIconTheme takes an icon from the first of index.theme's Directories that has it
// (folder-drag-accept-symbolic is in both symbolic/places and symbolic/status).
const directories = readFileSync(`${theme}index.theme`, "utf8")
  .match(/^Directories=(.*)$/m)![1]
  .split(",")
  .filter((dir) => dir.startsWith("symbolic/"))
  .map((dir) => `${theme}Adwaita/${dir}/`)
  .filter((dir) => existsSync(dir));

await buildIconPackage(
  [
    ...directories,
    // libadwaita's own icons (adw-entry-apply, adw-external-link, …), used by Adw widgets.
    new URL("../../upstream/libadwaita/src/icons/", import.meta.url).pathname,
  ],
  new URL(".", import.meta.url).pathname,
);
