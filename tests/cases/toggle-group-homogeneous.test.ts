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

  // A size group makes every toggle as large as the largest one, on one line
  // (adw_toggle_group_set_homogeneous()).
  const toggles = (s: WidgetSnapshot) => s.children!.filter((c) => c.css_name === "toggle");
  const [first] = toggles(web);
  toggles(native).forEach((n, i) => {
    const w = toggles(web)[i]!;
    gtkAssert.numbersEqual(first!.width, w.width, `toggle ${i} width, web`);
    gtkAssert.numbersClose(
      outerWidth(n),
      w.width,
      {
        tolerance: 6,
        reason:
          "text widths: GTK rounds labels up to whole pixels, and Firefox measures bold text up to ~5px off Pango",
      },
      `toggle ${i} width`,
    );
    gtkAssert.numbersEqual(outerHeight(n), w.height, `toggle ${i} height`);
  });
  gtkAssert.numbersEqual(outerHeight(native), web.height, "height");
});
