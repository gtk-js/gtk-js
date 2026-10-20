import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// Inverted, the progress is the fraction (30%) from the end, with the .right
// class (allocate_trough(), update_node_classes()).
gtkTest("progressbar-inverted-30", (native, web) => {
  expect(
    compare(native, web).failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
  const n = findChild(native, "progress");
  const w = findChild(web, "progress");
  expect(compare(n, w).failures).toEqual([]);
  expect(w.css_classes).toEqual(expect.arrayContaining(n.css_classes ?? []));
  expect(w.css_classes).not.toContain("left");
  for (const key of ["x", "y", "width", "height"] as const) {
    gtkAssert.numbersEqual(n[key] ?? 0, w[key] ?? 0, `progress ${key}`);
  }
});
