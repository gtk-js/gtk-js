import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: border_radius, background_color, font_weight — inner-child bleed.
//
// border_radius: per _buttons.scss:472-473, the outer `splitbutton` node gets
// `border-radius: $button_radius` (9px all corners). Lines 518-523 then set
// `> button:dir(ltr) { border-top-right-radius: 0; border-bottom-right-radius: 0 }`
// on the inner button. Native extraction reports {9,0,0,9} on the outer node,
// capturing the inner button's clipped right corners. Web correctly applies 9px
// to the outer container per the SCSS rule on `splitbutton`.
//
// background_color: the `splitbutton` selector in _buttons.scss has no background
// rule. Background comes from `%button_basic` extended by the inner `button`
// children. Native extraction captures the child button's background on the
// outer node; web correctly shows null.
//
// font_weight: per _buttons.scss:24, `button { font-weight: bold }` applies to
// the inner `button` child, not `splitbutton` (adw-split-button.c:485,
// css_name="splitbutton"). Native extraction bleeds the child's bold weight.
gtkTest("split-button-text-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius") &&
        f.property !== "font_weight",
    ),
  ).toEqual([]);
});
