import { buildIconPackage } from "@gtk-js/icon-helpers/build";

const icons = new URL("../../upstream/gtk/gtk/icons/", import.meta.url).pathname;

await buildIconPackage(
  icons,
  new URL(".", import.meta.url).pathname,
  // GTK's own image-missing, which it shows when no theme has the name.
  `${icons}16x16/status/image-missing.png`,
);
