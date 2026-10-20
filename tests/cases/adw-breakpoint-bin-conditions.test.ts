import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// The bin has a ref, `400pt` is 533px and the parenthesized condition doesn't
// match: only the first breakpoint applies, setting the opacity to 0.5.
gtkTest("adw-breakpoint-bin-conditions", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  gtkAssert.numbersClose(
    native.opacity,
    web.opacity,
    { tolerance: 0.01, reason: "GTK stores the opacity in 8 bits" },
    "opacity",
  );
});
