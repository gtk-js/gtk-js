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
gtkTest("toggle-group-icon", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => f.property !== "font_weight" && !f.property.startsWith("shadows")),
  ).toEqual([]);

  gtkAssert.numbersEqual(outerWidth(native), web.width, "width");
  gtkAssert.numbersEqual(outerHeight(native), web.height, "height");

  // Each toggle's image fills its width and is centered vertically, like
  // gtk_button_set_icon_name() lays it out.
  const toggles = (s: WidgetSnapshot) => s.children!.filter((c) => c.css_name === "toggle");
  toggles(native).forEach((n, i) => {
    const w = toggles(web)[i]!;
    gtkAssert.numbersEqual(n.x!, w.x!, `toggle ${i} x`);
    gtkAssert.numbersEqual(outerWidth(n), w.width, `toggle ${i} width`);
    const [nImage, wImage] = [n.children![0]!, w.children![0]!];
    expect(wImage.css_name).toBe("image");
    for (const key of ["x", "y", "width", "height"] as const) {
      gtkAssert.numbersEqual(nImage[key]!, wImage[key]!, `toggle ${i} image ${key}`);
    }
  });
});
