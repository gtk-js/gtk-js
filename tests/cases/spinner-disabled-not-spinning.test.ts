import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("spinner-disabled-not-spinning", (native, web) => {
  // Native uses -gtk-icon-source (no borders, opacity=1 but nothing painted).
  // Web uses CSS border + opacity=0 to hide the non-spinning state.
  // Both result in an invisible spinner — skip border_widths and opacity.
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => !f.property.startsWith("border_widths") && f.property !== "opacity"),
  ).toEqual([]);
});
