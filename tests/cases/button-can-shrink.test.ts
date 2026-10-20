import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Native sizes are content-box ones, web ones border-box.
const contentWidth = (w: WidgetSnapshot) =>
  w.width - w.padding.left - w.padding.right - w.border_widths.left - w.border_widths.right;
const contentHeight = (w: WidgetSnapshot) =>
  w.height - w.padding.top - w.padding.bottom - w.border_widths.top - w.border_widths.bottom;

gtkTest("button-can-shrink", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);

  // A button given 120px for a longer label: with can-shrink the label
  // ellipsizes on one line rather than wrapping (gtk_button_set_can_shrink()).
  expect(contentWidth(web)).toBeCloseTo(native.width, 0);
  expect(contentHeight(web)).toBeCloseTo(native.height, 0);
  expect(findChild(web, "label").width).toBeCloseTo(findChild(native, "label").width, 0);
});
