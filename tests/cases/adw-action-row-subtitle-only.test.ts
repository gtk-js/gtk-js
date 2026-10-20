import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// An empty title is hidden (adw-action-row.ui binds the label's visible to
// string_is_not_empty), so the subtitle alone is centered in the row.
gtkTest("adw-action-row-subtitle-only", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const titleBox = (list: WidgetSnapshot) => findChild(list, "box", 1);
  expect(titleBox(web).children?.map((label) => label.css_classes)).toEqual([
    ["gtk-label", "subtitle"],
  ]);
  expect(titleBox(web).height).toBeCloseTo(titleBox(native).height, 0);
  // GTK rounds the centered box down to a whole pixel.
  expect(Math.abs((titleBox(web).y ?? 0) - (titleBox(native).y ?? 0))).toBeLessThanOrEqual(0.5);
});
