import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// Three 4-character tabs and an "x" fit on one 200px line, two lines in all;
// with 8-character tabs the "x" would wrap to a third line, a row taller
// than native's. (The rows' height is the monospace font's: 17px for DejaVu
// Sans Mono, 18px for Adwaita Mono.)
gtkTest("source-view-tab-width", (native, web) => {
  gtkAssert.numbersEqual(native.height, web.height, "height");
});
