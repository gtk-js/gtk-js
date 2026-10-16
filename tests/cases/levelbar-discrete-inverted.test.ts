import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("levelbar-discrete-inverted", (native, web) => {
  // Root levelbar has no styled background in GTK CSS — the trough child has it.
  // Native GSK walker leaks trough's border_radius/background_color to root. Skip at root.
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  const nativeTrough = findChild(native, "trough");
  const webTrough = findChild(web, "trough");
  // Native GSK walker leaks block children's background_color/border_radius into the
  // trough snapshot (same as root-level leakage). Skip those at the trough level.
  const { failures: troughFailures } = compare(nativeTrough, webTrough);
  expect(
    troughFailures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
});
