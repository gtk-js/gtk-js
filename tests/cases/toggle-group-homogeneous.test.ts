import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: font_weight, shadows — inner toggle child bleed.
//
// font_weight: per _toggle-group.scss:28-30, `toggle-group > toggle` gets
// `font-weight: bold`. The outer `toggle-group` node has no font-weight rule.
// Native extraction bleeds the child toggle's bold weight to the parent.
//
// shadows: per _toggle-group.scss:95-97 (standard contrast), `> toggle:checked`
// gets a 2-layer drop-shadow. This is on the inner checked toggle, not the outer
// toggle-group. Native extraction captures the child's shadow on the parent.
gtkTest("toggle-group-homogeneous", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => f.property !== "font_weight" && !f.property.startsWith("shadows")),
  ).toEqual([]);
});
