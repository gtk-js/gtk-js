import { buildIconPackage } from "@gtk-js/icon-helpers/build";

await buildIconPackage(
  [
    new URL("../../upstream/adwaita-icon-theme/Adwaita/symbolic/", import.meta.url).pathname,
    // libadwaita's own icons (adw-entry-apply, adw-external-link, …), used by Adw widgets.
    new URL("../../upstream/libadwaita/src/icons/", import.meta.url).pathname,
  ],
  new URL(".", import.meta.url).pathname,
);
