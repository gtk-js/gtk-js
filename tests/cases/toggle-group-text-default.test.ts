import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: font_weight, shadows — inner toggle child bleed.
//
// font_weight: per _toggle-group.scss:28-30, `toggle-group > toggle` gets
// `font-weight: bold`. The outer `toggle-group` node (adw-toggle-group.c:1092,
// css_name="toggle-group") has no font-weight rule. Native extraction bleeds
// the child toggle's bold weight to the parent.
//
// shadows: per _toggle-group.scss:95-97 (standard contrast branch),
// `> toggle:checked` gets `box-shadow: 0 1px 3px 1px RGB(0 0 6 / 7%),
// 0 2px 6px 2px RGB(0 0 6 / 3%)`. This shadow is on the inner checked toggle,
// not the outer toggle-group. Native extraction captures the child's drop-shadow
// on the parent node.
gtkTest("toggle-group-text-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => f.property !== "font_weight" && !f.property.startsWith("shadows")),
  ).toEqual([]);
});
