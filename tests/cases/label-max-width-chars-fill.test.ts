import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// max-width-chars only limits the label's natural width (get_default_widths()):
// filling the 400px box, the label is as wide as the box and its text one line.
gtkTest("label-max-width-chars-fill", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const [nativeLabel] = native.children!;
  const [webLabel] = web.children!;
  gtkAssert.numbersEqual(nativeLabel!.width, webLabel!.width, "label width");
  // One line, within GTK's whole-pixel rounding of the line height.
  expect(Math.abs(nativeLabel!.height - webLabel!.height)).toBeLessThanOrEqual(1);
});
