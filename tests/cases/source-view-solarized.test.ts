import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// solarized-light: base01 text on base3, base1 line numbers on base2.
gtkTest("source-view-solarized", (native, web) => {
  gtkAssert.colorsEqual(native.color, web.color, "color");
  gtkAssert.colorsEqual(
    { r: 0xfd / 255, g: 0xf6 / 255, b: 0xe3 / 255, a: 1 },
    web.background_color,
    "background_color",
  );
  const gutter = findChild(web, "gutter");
  gtkAssert.colorsEqual(findChild(native, "gutter").color, gutter.color, "gutter color");
  gtkAssert.colorsEqual(
    { r: 0xee / 255, g: 0xe8 / 255, b: 0xd5 / 255, a: 1 },
    gutter.background_color,
    "gutter background_color",
  );
});
