import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("scrollbar-default", (native, web) => {
  // Native root picks up trough's rounded background from child render nodes.
  // Skip root-only leakage and keep all other properties strict.
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  expect(compare(nativeSlider, webSlider).failures).toEqual([]);
});
