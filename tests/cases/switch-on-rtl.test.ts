import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// In RTL, "on" puts the slider on the left (is_right_side() in gtkswitch.c).
gtkTest("switch-on-rtl", (native, web) => {
  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  gtkAssert.numbersEqual(nativeSlider.x!, webSlider.x!, "slider.x");
  gtkAssert.numbersEqual(nativeSlider.width, webSlider.width, "slider.width");

  // Native root picks up slider's box-shadow (see switch-on-default.test.ts).
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);
});
