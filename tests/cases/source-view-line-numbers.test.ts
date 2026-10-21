import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// The line numbers are in a gutter in the left border window, in the
// scheme's line-numbers colors, as wide as "99" and 6px on each side.
gtkTest("source-view-line-numbers", (native, web) => {
  gtkAssert.colorsEqual(native.color, web.color, "color");
  gtkAssert.numbersEqual(native.height, web.height, "height");
  for (const name of ["border", "gutter", "gutterrenderer"]) {
    const n = findChild(native, name);
    const w = findChild(web, name);
    gtkAssert.numbersEqual(n.width, w.width, `${name} width`);
    gtkAssert.numbersEqual(n.height, w.height, `${name} height`);
    gtkAssert.numbersEqual(n.x ?? 0, w.x ?? 0, `${name} x`);
    gtkAssert.colorsEqual(n.color, w.color, `${name} color`);
  }
  expect(findChild(web, "border").css_classes).toContain("left");
  // Adwaita's line-numbers background (light_1).
  gtkAssert.colorsEqual(
    { r: 1, g: 1, b: 1, a: 1 },
    findChild(web, "gutter").background_color,
    "gutter background_color",
  );
});
