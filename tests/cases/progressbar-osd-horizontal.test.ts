import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("progressbar-osd-horizontal", (native, web) => {
  // Root progressbar has no styled background in GTK CSS — the trough child has it.
  // Native GSK walker leaks trough's border_radius/background_color to root. Skip at root.
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  const nativeTrough = findChild(native, "trough");
  const webTrough = findChild(web, "trough");
  // OSD trough has background-color: transparent. Native GSK walker leaks the
  // progress child's ColorNode (accent blue) as the trough background since there's
  // no trough-level ColorNode to capture first. Skip background_color here.
  const { failures: troughFailures } = compare(nativeTrough, webTrough);
  expect(troughFailures.filter((f) => f.property !== "background_color")).toEqual([]);
});
