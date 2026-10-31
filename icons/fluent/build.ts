// Builds the Fluent icons: Microsoft's Fluent UI System Icons, the icons of
// Windows 11 and Fluent UI, under the freedesktop names GTK widgets ask for
// (icon-map.ts).
import { buildIconPackage } from "@gtk-js/icon-helpers/build";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "fs";
import { createRequire } from "module";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { ICON_MAP } from "./icon-map.ts";

const fluentIcons = join(
  dirname(createRequire(import.meta.url).resolve("@fluentui/svg-icons/package.json")),
  "icons",
);

const work = mkdtempSync(join(tmpdir(), "gtk-js-fluent-icons-"));
try {
  for (const [name, icon] of Object.entries(ICON_MAP)) {
    const [base, variant = "regular"] = icon.split(":");
    const file = join(fluentIcons, `${base}_16_${variant}.svg`);
    if (!existsSync(file)) throw new Error(`${name}: no 16px ${variant} "${base}" Fluent icon`);
    copyFileSync(file, join(work, `${name}-symbolic.svg`));
  }
  await buildIconPackage(work, new URL(".", import.meta.url).pathname);
} finally {
  rmSync(work, { recursive: true, force: true });
}
