import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// A wrapping label is as tall as its lines rounded up to whole pixels, like
// GTK's (gtk_label_measure()), so the label after it starts on a whole pixel.
// The rounding uses calc-size(), which Firefox doesn't support yet: there the
// heights stay fractional (up to 1px short, and what follows by as much).
gtkTest("label-wrap-heights", (native, web, browserName) => {
  expect(compare(native, web).failures).toEqual([]);
  const tolerance =
    browserName === "firefox"
      ? { tolerance: 2, reason: "no calc-size() in Firefox: up to 1px short per wrapping label" }
      : { tolerance: 0.5, reason: "default" };
  ["Body", "Default", "After"].forEach((name, i) => {
    const n = native.children![i]!;
    const w = web.children![i]!;
    gtkAssert.numbersClose(n.height, w.height, tolerance, `${name} height`);
    gtkAssert.numbersClose(n.y!, w.y!, tolerance, `${name} y`);
  });
});
