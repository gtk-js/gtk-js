import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// Without a monospace-font-name setting, AdwStyleManager uses the "Monospace"
// family at gtk-font-name's size (11pt), not a smaller 10pt font.
gtkTest("label-monospace", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  gtkAssert.numbersEqual(native.height, web.height, "height");
  expect(Math.abs(web.width - native.width)).toBeLessThanOrEqual(5);
});
