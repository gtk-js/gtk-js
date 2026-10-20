import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// Native sizes are content sizes, web ones border-box sizes.
const outerWidth = (s: WidgetSnapshot) =>
  s.width + s.padding.left + s.padding.right + s.border_widths.left + s.border_widths.right;
const outerHeight = (s: WidgetSnapshot) =>
  s.height + s.padding.top + s.padding.bottom + s.border_widths.top + s.border_widths.bottom;

// Filtered: font_weight, shadows — the checked toggle's bold weight and shadow
// show up on the group natively (see toggle-group-text-default).
gtkTest("toggle-group-can-shrink", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => f.property !== "font_weight" && !f.property.startsWith("shadows")),
  ).toEqual([]);

  // Narrower than its contents: can-shrink ellipsizes the labels
  // (gtk_button_set_can_shrink()), which stay on one line inside their toggles.
  gtkAssert.numbersEqual(outerWidth(native), web.width, "width");
  gtkAssert.numbersEqual(outerHeight(native), web.height, "height");
  const toggles = (s: WidgetSnapshot) => s.children!.filter((c) => c.css_name === "toggle");
  toggles(native).forEach((n, i) => {
    const w = toggles(web)[i]!;
    const shrink = {
      tolerance: 6,
      reason:
        "text widths: GTK rounds labels up to whole pixels, and Firefox measures bold text up to ~5px off Pango",
    };
    gtkAssert.numbersClose(outerWidth(n), w.width, shrink, `toggle ${i} width`);
    gtkAssert.numbersEqual(outerHeight(n), w.height, `toggle ${i} height`);
    const [nLabel, wLabel] = [n.children![0]!, w.children![0]!];
    gtkAssert.numbersClose(outerWidth(nLabel), wLabel.width, shrink, `toggle ${i} label width`);
    gtkAssert.numbersClose(nLabel.x!, wLabel.x!, shrink, `toggle ${i} label x`);
  });
});
