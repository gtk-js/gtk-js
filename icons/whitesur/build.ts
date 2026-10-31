import { buildIconPackage, iconThemeFiles } from "@gtk-js/icon-helpers/build";

const theme = new URL("../../upstream/whitesur-icon-theme/", import.meta.url).pathname;
// install.sh copies src/ and the aliases in links/ into one theme.
const installed = { links: `${theme}links/` };

await buildIconPackage(
  [
    // Widgets ask for symbolic icons: GtkIconTheme never takes a full-color one for them.
    ...iconThemeFiles(`${theme}src/`, { ...installed, symbolic: true }),
    // libadwaita's own icons (adw-entry-apply, adw-external-link, …), used by Adw widgets.
    new URL("../../upstream/libadwaita/src/icons/", import.meta.url).pathname,
  ],
  new URL(".", import.meta.url).pathname,
  // What GtkIconTheme shows for a name the theme doesn't have: its full-color image-missing.
  iconThemeFiles(`${theme}src/`, installed).find((icon) => icon.name === "image-missing")!.path,
);
