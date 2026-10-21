import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// A new buffer's scheme is "classic" (DEFAULT_STYLE_SCHEME): black text on
// white. The native walker doesn't reach the view's background, so the web's
// is checked against the scheme's `text` background.
gtkTest("source-view-default", (native, web) => {
  expect(web.css_classes).toEqual(expect.arrayContaining(native.css_classes ?? []));
  gtkAssert.colorsEqual(native.color, web.color, "color");
  gtkAssert.colorsEqual({ r: 1, g: 1, b: 1, a: 1 }, web.background_color, "background_color");
  gtkAssert.numbersEqual(native.width, web.width, "width");
  // Four monospace lines, 17px each.
  gtkAssert.numbersEqual(native.height, web.height, "height");
  expect(web.children?.some((c) => c.css_name === "border")).toBe(false);
});
