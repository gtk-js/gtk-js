import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// Without a monospace-font-name setting, AdwStyleManager uses the "Monospace"
// family at gtk-font-name's size (11pt), not a smaller 10pt font (16px lines).
gtkTest("label-monospace", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  gtkAssert.numbersClose(
    native.height,
    web.height,
    {
      tolerance: 1,
      reason:
        "Pango's line height is the resolved monospace font's ascent + descent; the web uses --gtk-line-height (1.2em, Cantarell's) for every font",
    },
    "height",
  );
  expect(Math.abs(web.width - native.width)).toBeLessThanOrEqual(5);
});
