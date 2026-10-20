import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("switch-on-disabled", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);

  // GTK propagates the insensitive state to the slider, so slider:disabled makes its
  // shadow transparent (_switch.scss), which GTK doesn't draw.
  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  const visible = { ...webSlider, shadows: webSlider.shadows.filter((s) => s.color.a > 0) };
  expect(compare(nativeSlider, visible).failures).toEqual([]);
});
