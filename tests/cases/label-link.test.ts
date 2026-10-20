import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// GTK draws a label's link in the link node's color but with the label's
// alpha (get_color() in gskpango.c takes a Pango color's alpha from the
// label's color): 80% in light Adwaita, like the rest of the text. The web
// link keeps the link color and its text is masked with the label's color.
gtkTest("label-link", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  expect(native.css_classes).toContain("link");
  expect(web.css_classes).toContain("link");
  const label = native.color!;
  const nativeLink = native.text_colors!.find(
    (c) => Math.abs(c.r - label.r) + Math.abs(c.g - label.g) + Math.abs(c.b - label.b) > 0.1,
  );
  expect(nativeLink).toBeDefined();
  const webLink = findChild(web, "link").color!;
  gtkAssert.colorsEqual(nativeLink!, { ...webLink, a: webLink.a * web.color!.a }, "link color");
});
