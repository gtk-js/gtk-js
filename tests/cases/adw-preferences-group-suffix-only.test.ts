import { expect } from "vite-plus/test";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

// A header with only a suffix is single-line (is_single_line()), so the theme
// adds no 6px below it and the list is as far down as natively.
gtkTest("adw-preferences-group-suffix-only", (native, web) => {
  const header = (group: WidgetSnapshot) => findChild(group, "box", 1);
  const listBox = (group: WidgetSnapshot) => findChild(group, "box", 2);
  expect(header(native).css_classes).toContain("single-line");
  expect(header(web).css_classes).toContain("single-line");
  expect(listBox(web).y).toBeCloseTo(listBox(native).y!, 0);
});
