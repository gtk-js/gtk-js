import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// Native child sizes are content sizes, web ones border-box sizes.
const outerWidth = (w: WidgetSnapshot, isWeb: boolean) =>
  isWeb
    ? w.width
    : w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;
const outerHeight = (w: WidgetSnapshot, isWeb: boolean) =>
  isWeb
    ? w.height
    : w.height + w.padding.top + w.padding.bottom + w.border_widths.top + w.border_widths.bottom;

// GtkCenterLayout gives each child the full height unless its valign says
// otherwise, and an expanding start child all the room up to the center child.
gtkTest("center-box-fill-expand", (native, web) => {
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
    const [start, center, end] = box.children!;
    return {
      startHeight: outerHeight(start!, isWeb),
      endY: end!.y ?? Number.NaN,
      endHeight: outerHeight(end!, isWeb),
      // The start child reaches the center child, whose x depends on its text width.
      startToCenter: (center!.x ?? Number.NaN) - outerWidth(start!, isWeb),
    };
  };
  const n = measure(native, false);
  const w = measure(web, true);
  gtkAssert.numbersEqual(n.startHeight, w.startHeight, "start height (valign fill)");
  gtkAssert.numbersEqual(n.endY, w.endY, "end y (valign start)");
  gtkAssert.numbersEqual(n.endHeight, w.endHeight, "end height (valign start)");
  gtkAssert.numbersEqual(n.startToCenter, w.startToCenter, "start to center (hexpand)");
});
