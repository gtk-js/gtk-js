import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// 1 of 5 reaches the "full" offset (1.0): offsets aren't scaled by the maximum
// (update_level_style_classes()). The blocks share the trough's width, margins
// included (gtk_level_bar_allocate_trough_discrete()).
gtkTest("levelbar-discrete-1-of-5", (native, web) => {
  expect(
    compare(native, web).failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
  for (let i = 0; i < 5; i++) {
    const n = findChild(native, "block", i);
    const w = findChild(web, "block", i);
    expect(w.css_classes).toEqual(expect.arrayContaining(n.css_classes ?? []));
    expect(compare(n, w).failures).toEqual([]);
    for (const key of ["x", "y", "width", "height"] as const) {
      gtkAssert.numbersEqual(n[key] ?? 0, w[key] ?? 0, `block ${i} ${key}`);
    }
  }
});
