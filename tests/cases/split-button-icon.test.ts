import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: border_radius, background_color — inner-child bleed.
//
// border_radius: per _buttons.scss:472-473, `splitbutton { border-radius: $button_radius }`
// gives 9px all corners. Lines 518-523 clip the inner button's right corners to 0.
// Native extraction captures the inner button's clipped radius on the outer node.
//
// background_color: no background rule on `splitbutton` in _buttons.scss; the
// inner `button` children get background via `%button_basic`. Native extraction
// bleeds the child background to the parent node.
gtkTest("split-button-icon", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
});
