import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// Native child sizes are content sizes, web ones border-box sizes.
const outerWidth = (w: WidgetSnapshot, isWeb: boolean) =>
  isWeb
    ? w.width
    : w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;

// An expanding center child gets size - 2 × (max(start, end) + spacing)
// (gtk_center_layout_distribute()): it reaches the wider end child and stays
// centered, which leaves the same room before it.
gtkTest("center-box-expand-center", (native, web) => {
  // The buttons' background, radius and bold text bleed into the native root
  // node's report (see actionbar-default).
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius") &&
        f.property !== "font_weight",
    ),
  ).toEqual([]);
  const measure = (box: WidgetSnapshot, isWeb: boolean) => {
    const [, center, end] = box.children!;
    const centerEnd = (center!.x ?? Number.NaN) + outerWidth(center!, isWeb);
    return {
      centerToEnd: (end!.x ?? Number.NaN) - centerEnd,
      // As wide before the center child as the end child is.
      centered: (center!.x ?? Number.NaN) - outerWidth(end!, isWeb),
    };
  };
  const n = measure(native, false);
  const w = measure(web, true);
  gtkAssert.numbersEqual(n.centerToEnd, w.centerToEnd, "center child to end child");
  gtkAssert.numbersEqual(n.centered, w.centered, "room before the center child");
});
