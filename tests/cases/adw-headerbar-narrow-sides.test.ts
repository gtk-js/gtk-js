import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// AdwHeaderBar's center box has shrink-center-last FALSE
// (adw_header_bar_init()). Narrower than its natural width, the title shrinks
// to its minimum, the start title keeps its natural width and pushes the title
// along, and the end title is clamped by the start one's minimum only
// (gtk_center_layout_distribute()), so it overlaps the title.
// Filtered as in adw-headerbar-start-end, plus the titles' bold text.
gtkTest("adw-headerbar-narrow-sides", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "font_weight" &&
        !f.property.startsWith("border_radius") &&
        !f.property.startsWith("inset_shadows"),
    ),
  ).toEqual([]);
  // The titles' border boxes in the center box (native wraps the side boxes
  // in a gizmo, which the web doesn't need).
  const title = (node: WidgetSnapshot, x = 0): { x: number; width: number } =>
    node.css_name === "windowtitle"
      ? { x: x + (node.x ?? Number.NaN), width: node.width }
      : title(node.children![0]!, x + (node.x ?? Number.NaN));
  const measure = (headerbar: WidgetSnapshot, isWeb: boolean) => {
    const box = headerbar.children![0]!.children![0]!;
    // Native sizes are content sizes, web ones border-box sizes.
    const size = isWeb
      ? box.width -
        box.padding.left -
        box.padding.right -
        box.border_widths.left -
        box.border_widths.right
      : box.width;
    const [start, center, end] = box.children!.map((child) => title(child));
    return {
      startToCenter: center!.x - (start!.x + start!.width),
      endToEdge: size - (end!.x + end!.width),
      overlap: center!.x + center!.width - end!.x,
    };
  };
  const n = measure(native, false);
  const w = measure(web, true);
  gtkAssert.numbersEqual(n.startToCenter, w.startToCenter, "start title to title");
  gtkAssert.numbersEqual(n.endToEdge, w.endToEdge, "end title to the edge");
  expect(w.overlap).toBeGreaterThan(0);
  // Text widths differ by a few pixels across browsers.
  expect(Math.abs(w.overlap - n.overlap)).toBeLessThan(8);
});
