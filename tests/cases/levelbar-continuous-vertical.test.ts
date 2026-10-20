import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("levelbar-continuous-vertical", (native, web) => {
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

  // The trough and the empty block fill the bar's height; the filled block is
  // the value's share of it (gtk_level_bar_allocate_trough_continuous()).
  gtkAssert.numbersEqual(native.height, web.height, "height");
  gtkAssert.numbersEqual(native.width, web.width, "width");
  for (const [name, i] of [
    ["trough", 0],
    ["block", 0],
    ["block", 1],
  ] as const) {
    const n = findChild(native, name, i);
    const w = findChild(web, name, i);
    for (const key of ["x", "y", "width", "height"] as const) {
      gtkAssert.numbersEqual(n[key] ?? 0, w[key] ?? 0, `${name} ${i} ${key}`);
    }
  }
});
