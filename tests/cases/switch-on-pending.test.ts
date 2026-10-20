import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// A delayed state change: `active` puts the slider on the "on" side, while `state`
// (gtk_switch_set_state(), :checked) keeps the trough off until the backend catches up.
gtkTest("switch-on-pending", (native, web) => {
  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  gtkAssert.numbersEqual(nativeSlider.x!, webSlider.x!, "slider.x");
  gtkAssert.numbersEqual(nativeSlider.y!, webSlider.y!, "slider.y");

  // Native root picks up slider's box-shadow (see switch-on-default.test.ts).
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);
});
