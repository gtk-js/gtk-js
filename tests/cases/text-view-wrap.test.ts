import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// Wrapped paragraphs of eight rows, one, three and none: each is its rows'
// height to the nearest pixel (PANGO_PIXELS() of its extents), not as many
// whole-pixel rows (8 × 17.07px is 137px, not 136px).
gtkTest("text-view-wrap", (native, web) => {
  gtkAssert.numbersEqual(native.height, web.height, "height");
  gtkAssert.numbersEqual(native.width, web.width, "width");
});
