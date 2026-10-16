import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("scale-default", (native, web) => {
  // Native root picks up trough background/rounded corners/shadows from child nodes.
  // Skip those leaked root properties and keep all other properties strict.
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius") &&
        !f.property.startsWith("shadows"),
    ),
  ).toEqual([]);

  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  expect(compare(nativeSlider, webSlider).failures).toEqual([]);
});
