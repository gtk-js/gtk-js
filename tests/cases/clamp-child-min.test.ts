import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// A child that needs more than the maximum size gets its minimum size, centered
// at (801 - 462) / 2 = 169 in whole pixels (adw_clamp_layout_allocate()).
gtkTest("clamp-child-min", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const nativeChild = findChild(native, "box");
  const webChild = findChild(web, "box");
  gtkAssert.numbersEqual(nativeChild.width, webChild.width, "child width");
  gtkAssert.numbersClose(
    nativeChild.x ?? Number.NaN,
    webChild.x ?? Number.NaN,
    { tolerance: 0.1, reason: "GTK centers the child on whole pixels" },
    "child x",
  );
});
