import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// Inverted, the filled block is the value (30%), drawn over the empty one from
// the end (gtk_level_bar_allocate_trough_continuous()).
gtkTest("levelbar-continuous-inverted", (native, web) => {
  // Native GSK walker leaks the trough's background/radius to the root (see
  // levelbar-continuous-default).
  expect(
    compare(native, web).failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
  const nativeTrough = findChild(native, "trough");
  const webTrough = findChild(web, "trough");
  gtkAssert.numbersEqual(nativeTrough.width, webTrough.width, "trough width");
  gtkAssert.numbersEqual(nativeTrough.height, webTrough.height, "trough height");
  // The second block node is the filled one.
  for (const i of [0, 1]) {
    const n = findChild(native, "block", i);
    const w = findChild(web, "block", i);
    expect(w.css_classes).toEqual(expect.arrayContaining(n.css_classes ?? []));
    expect(compare(n, w).failures).toEqual([]);
    for (const key of ["x", "y", "width", "height"] as const) {
      gtkAssert.numbersEqual(n[key] ?? 0, w[key] ?? 0, `block ${i} ${key}`);
    }
  }
});
