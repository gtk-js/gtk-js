import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// The button gets .image-text-button from its content (adw_button_content_root()),
// and the content's box is centered in it.
gtkTest("button-content-button", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  expect(web.css_classes).toContain("image-text-button");
  gtkAssert.numbersClose(
    findChild(native, "box").x!,
    findChild(web, "box").x!,
    { tolerance: 2, reason: "web label widths are fractional (Firefox: up to ~1.6px narrower)" },
    "box x",
  );
});
