import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// Three 4-character tabs and an "x" fit on one 200px line; with 8-character
// tabs the "x" would wrap to a third line.
gtkTest("source-view-tab-width", (native, web) => {
  gtkAssert.numbersEqual(native.height, web.height, "height");
  gtkAssert.numbersEqual(34, web.height, "two lines");
});
