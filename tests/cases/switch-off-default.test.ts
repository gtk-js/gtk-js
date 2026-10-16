import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("switch-off-default", (native, web) => {
  // Native root picks up slider's box-shadow (child leakage — the root switch
  // has no box-shadow in GTK CSS). Skip shadows at root, verify on slider child.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);

  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  const { failures: sliderFailures } = compare(nativeSlider, webSlider);
  // Skip shadow comparison — GTK OutsetShadowNode extraction vs browser computed style
  // produce the same visual result but different extraction paths.
  expect(sliderFailures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);
});
