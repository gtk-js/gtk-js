import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// Native widths are content widths, web ones border-box widths.
const outerWidth = (s: WidgetSnapshot) =>
  s.width + s.padding.left + s.padding.right + s.border_widths.left + s.border_widths.right;

// Filtered: font_weight, shadows — the checked toggle's bold weight and shadow
// show up on the group natively (see toggle-group-text-default).
gtkTest("toggle-group-fill", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => f.property !== "font_weight" && !f.property.startsWith("shadows")),
  ).toEqual([]);

  // Every toggle expands (add_toggle()), so they share the group's extra width.
  gtkAssert.numbersEqual(outerWidth(native), web.width, "width");
  const toggles = (s: WidgetSnapshot) => s.children!.filter((c) => c.css_name === "toggle");
  toggles(native).forEach((n, i) => {
    const w = toggles(web)[i]!;
    const rounding = {
      tolerance: 6,
      reason:
        "text widths: GTK rounds labels up to whole pixels, and Firefox measures bold text up to ~5px off Pango",
    };
    gtkAssert.numbersClose(n.x!, w.x!, rounding, `toggle ${i} x`);
    gtkAssert.numbersClose(outerWidth(n), w.width, rounding, `toggle ${i} width`);
  });
});
