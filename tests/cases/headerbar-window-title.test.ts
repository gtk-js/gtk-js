import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

// Without a title widget, the header bar shows its window's title in a bold
// label.title (construct_title_label()). inset_shadows: see headerbar-default;
// font_weight: the native root reports its bold title's (headerbar-with-title).
gtkTest("headerbar-window-title", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => !f.property.startsWith("inset_shadows") && f.property !== "font_weight"),
  ).toEqual([]);
  const nativeLabel = findChild(native, "label");
  const webLabel = findChild(web, "label");
  expect(webLabel.css_classes).toContain("title");
  expect(webLabel.font_weight).toBe(nativeLabel.font_weight);
  // Native widths are content widths; the web label's includes its padding.
  const webTextWidth = webLabel.width - webLabel.padding.left - webLabel.padding.right;
  expect(webLabel.padding.left).toBe(nativeLabel.padding.left);
  expect(Math.abs(webTextWidth - nativeLabel.width)).toBeLessThanOrEqual(5);
  expect(webLabel.height).toBeCloseTo(nativeLabel.height, 0);
});
