import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** Native sizes are content boxes (gtk_widget_get_height()), web ones border boxes. */
const contentHeight = (s: WidgetSnapshot) =>
  s.height - s.padding.top - s.padding.bottom - s.border_widths.top - s.border_widths.bottom;

// The title ellipsizes on one line, in a box no wider than the row
// (adw-button-row.ui: ellipsize=end, box halign=center).
//
// Filtered: font_weight, the bold title's weight that native extraction reads
// on the list (see button-row-default.test.ts).
gtkTest("button-row-long-title", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "font_weight")).toEqual([]);
  const row = { native: findChild(native, "row"), web: findChild(web, "row") };
  expect(contentHeight(row.web)).toBeCloseTo(row.native.height, 0);
  const box = { native: findChild(native, "box"), web: findChild(web, "box") };
  expect(box.web.width).toBeCloseTo(box.native.width, 0);
  const label = { native: findChild(native, "label"), web: findChild(web, "label") };
  expect(label.web.height).toBeCloseTo(label.native.height, 0);
  expect(label.web.x).toBeCloseTo(label.native.x ?? 0, 0);
  expect(label.web.width).toBeCloseTo(label.native.width, 0);
});
