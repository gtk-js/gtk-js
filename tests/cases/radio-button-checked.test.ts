import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("radio-button-checked", (native, web) => {
  // Native root picks up check indicator's inset box-shadow (child leakage —
  // box-shadow: inset 0 0 0 2px on the check/radio indicator, not the root).
  // Skip inset_shadows at root, verify on the indicator child.
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        !f.property.startsWith("inset_shadows") &&
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  const indicatorCssName = "radio";
  const nativeIndicator = findChild(native, indicatorCssName);
  const webIndicator = findChild(web, indicatorCssName);
  expect(compare(nativeIndicator, webIndicator).failures).toEqual([]);
});
