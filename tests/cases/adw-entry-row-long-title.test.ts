import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Filtered: opacity — the empty-state animation bleed adw-entry-row-default
// describes.
gtkTest("adw-entry-row-long-title", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "opacity")).toEqual([]);
  // The title ellipsizes on one line (adw-entry-row.ui), so the row keeps
  // its height (native sizes are content boxes, web ones border boxes).
  const row = (s: WidgetSnapshot) => findChild(s, "row");
  expect(
    row(web).height -
      row(web).padding.top -
      row(web).padding.bottom -
      row(web).border_widths.bottom,
  ).toBeCloseTo(row(native).height, 0);
  // One line, whatever its line height in each browser.
  expect(findChild(web, "label").height).toBeLessThan(findChild(native, "label").height * 1.5);
});
