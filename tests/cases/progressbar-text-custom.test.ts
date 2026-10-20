import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("progressbar-text-custom", (native, web) => {
  // Root progressbar has no styled background in GTK CSS — the trough child has it.
  // Native GSK walker leaks trough's border_radius/background_color to root. Skip at root.
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  const nativeTrough = findChild(native, "trough");
  const webTrough = findChild(web, "trough");
  expect(compare(nativeTrough, webTrough).failures).toEqual([]);

  // The text node is dimmed (_progress-bar.scss) and one whole-pixel line tall.
  const nativeText = findChild(native, "text");
  const webText = findChild(web, "text");
  expect(compare(nativeText, webText).failures).toEqual([]);
  gtkAssert.numbersEqual(nativeText.height, webText.height, "text height");
  gtkAssert.numbersEqual(nativeText.x ?? 0, webText.x ?? 0, "text x");
});
