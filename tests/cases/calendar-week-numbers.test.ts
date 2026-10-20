import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

gtkTest("calendar-week-numbers", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("border_radius"))).toEqual([]);

  // All 8 columns of the homogeneous grid are as wide, the week numbers' too.
  const column = (grid: WidgetSnapshot, cls: string) => {
    const label = grid.children!.find((c) => c.css_classes?.includes(cls))!;
    return label.width + label.padding.left + label.padding.right;
  };
  for (const grid of [findChild(native, "grid"), findChild(web, "grid")]) {
    // Native label sizes leave out their padding.
    const day = column(grid, "day-name");
    expect(Math.abs(column(grid, "week-number") - day)).toBeLessThanOrEqual(1.5);
  }
});
