import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// An ellipsizing label's minimum width is the ellipsis, or width-chars if
// wider (get_static_size()), not its text: next to "Fixed" in boxes at their
// minimum width it is just the ellipsis (about 1em; Pango's "…" is 15px), and
// 5 characters with width-chars 5.
gtkTest("label-ellipsize-min-width", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  gtkAssert.numbersClose(
    findChild(native, "label", 0).width,
    findChild(web, "label", 0).width,
    { tolerance: 1, reason: "1em for the width of Pango's ellipsis" },
    "ellipsis-only label width",
  );
  gtkAssert.numbersClose(
    findChild(native, "label", 2).width,
    findChild(web, "label", 2).width,
    { tolerance: 1, reason: "width-chars in ch" },
    "width-chars label width",
  );
});
