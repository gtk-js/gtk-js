import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// The switch is as tall as its slider (gtk_switch_measure()), whatever the font size.
gtkTest("switch-off-title-1", (native, web) => {
  // Native sizes are the content box's, web ones the border box's.
  const { padding: p, border_widths: b } = web;
  gtkAssert.numbersEqual(native.width, web.width - p.left - p.right - b.left - b.right, "width");
  gtkAssert.numbersEqual(native.height, web.height - p.top - p.bottom - b.top - b.bottom, "height");

  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  gtkAssert.numbersEqual(nativeSlider.width, webSlider.width, "slider.width");
  gtkAssert.numbersEqual(nativeSlider.height, webSlider.height, "slider.height");

  // Native root picks up slider's box-shadow (see switch-on-default.test.ts).
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);
});
