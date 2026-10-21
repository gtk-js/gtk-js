import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// Adwaita-dark: light_5 text on libadwaita-dark, dark_2 line numbers.
gtkTest("source-view-current-line", (native, web) => {
  gtkAssert.colorsEqual(native.color, web.color, "color");
  gtkAssert.colorsEqual(
    { r: 0x1d / 255, g: 0x1d / 255, b: 0x20 / 255, a: 1 },
    web.background_color,
    "background_color",
  );
  gtkAssert.numbersEqual(native.height, web.height, "height");
  const gutter = findChild(web, "gutter");
  gtkAssert.colorsEqual(findChild(native, "gutter").color, gutter.color, "gutter color");
  gtkAssert.numbersEqual(findChild(native, "gutter").width, gutter.width, "gutter width");
});
