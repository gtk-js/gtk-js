import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// The trough fills a vertical bar's height (vexpand, valign fill) and the
// inverted progress is the fraction of it from the bottom (allocate_trough()).
gtkTest("progressbar-vertical-inverted", (native, web) => {
  expect(
    compare(native, web).failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
  gtkAssert.numbersEqual(native.width, web.width, "width");
  gtkAssert.numbersEqual(native.height, web.height, "height");
  for (const name of ["trough", "progress"]) {
    const n = findChild(native, name);
    const w = findChild(web, name);
    expect(w.css_classes).toEqual(expect.arrayContaining(n.css_classes ?? []));
    for (const key of ["x", "y", "width", "height"] as const) {
      gtkAssert.numbersEqual(n[key] ?? 0, w[key] ?? 0, `${name} ${key}`);
    }
  }
  expect(compare(findChild(native, "progress"), findChild(web, "progress")).failures).toEqual([]);
});
