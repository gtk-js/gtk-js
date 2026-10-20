import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// Native sizes are content sizes, web ones border-box sizes.
const outerWidth = (s: WidgetSnapshot) =>
  s.width + s.padding.left + s.padding.right + s.border_widths.left + s.border_widths.right;
const outerHeight = (s: WidgetSnapshot) =>
  s.height + s.padding.top + s.padding.bottom + s.border_widths.top + s.border_widths.bottom;

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

  // Separators have the group's orientation (add_toggle()), and the ones next
  // to the checked toggle are .hidden (should_hide_separators()).
  const separators = (s: WidgetSnapshot) => s.children!.filter((c) => c.css_name === "separator");
  const classes = (s: WidgetSnapshot) => s.css_classes!.filter((c) => !c.startsWith("gtk-"));
  expect(separators(web).map(classes)).toEqual(separators(native).map(classes));
  separators(native).forEach((n, i) => {
    const w = separators(web)[i]!;
    gtkAssert.numbersEqual(outerWidth(n), w.width, `separator ${i} width`);
    gtkAssert.numbersEqual(outerHeight(n), w.height, `separator ${i} height`);
    gtkAssert.numbersEqual(n.y!, w.y!, `separator ${i} y`);
  });

  gtkAssert.numbersEqual(outerHeight(native), web.height, "height");
});
