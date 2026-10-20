import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// A vertical trough fills the scale's height, with the slider and highlight
// halfway down it.
gtkTest("scale-vertical", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius") &&
        !f.property.startsWith("shadows"),
    ),
  ).toEqual([]);
  for (const name of ["trough", "highlight", "slider"]) {
    const n = findChild(native, name);
    const w = findChild(web, name);
    for (const key of ["x", "y", "width", "height"] as const) {
      gtkAssert.numbersEqual(n[key] ?? 0, w[key] ?? 0, `${name} ${key}`);
    }
  }
});
