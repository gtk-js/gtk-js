import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// The scheme's provider outranks the theme's insensitive colors: an
// insensitive view keeps the scheme's text and line number colors.
gtkTest("source-view-disabled", (native, web) => {
  gtkAssert.colorsEqual(native.color, web.color, "color");
  gtkAssert.colorsEqual({ r: 1, g: 1, b: 1, a: 1 }, web.background_color, "background_color");
  gtkAssert.colorsEqual(
    findChild(native, "gutterrenderer").color,
    findChild(web, "gutterrenderer").color,
    "gutterrenderer color",
  );
});
