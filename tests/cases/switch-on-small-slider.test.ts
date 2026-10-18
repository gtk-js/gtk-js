import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// A theme with a 12px slider with 5px margins and `switch { min-width: 22px }`, like
// Fluent: gtk_switch_measure() still makes the switch twice as wide as the slider
// (2 × 22 = 44px), and gtk_switch_allocate() puts the "on" slider in the right half.
gtkTest("switch-on-small-slider", (native, web) => {
  // Native sizes are the content box's, web ones the border box's.
  const { padding: p, border_widths: b } = web;
  gtkAssert.numbersEqual(native.width, web.width - p.left - p.right - b.left - b.right, "width");
  gtkAssert.numbersEqual(native.height, web.height - p.top - p.bottom - b.top - b.bottom, "height");

  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  gtkAssert.numbersEqual(nativeSlider.x!, webSlider.x!, "slider.x");
  gtkAssert.numbersEqual(nativeSlider.y!, webSlider.y!, "slider.y");
  gtkAssert.numbersEqual(nativeSlider.width, webSlider.width, "slider.width");
  gtkAssert.numbersEqual(nativeSlider.height, webSlider.height, "slider.height");

  // Native root picks up slider's box-shadow (see switch-on-default.test.ts).
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);
  const { failures: sliderFailures } = compare(nativeSlider, webSlider);
  expect(sliderFailures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);
});
