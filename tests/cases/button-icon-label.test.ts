import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Native sizes are content-box ones, web ones border-box.
const contentWidth = (w: WidgetSnapshot) =>
  w.width - w.padding.left - w.padding.right - w.border_widths.left - w.border_widths.right;
const contentHeight = (w: WidgetSnapshot) =>
  w.height - w.padding.top - w.padding.bottom - w.border_widths.top - w.border_widths.bottom;

gtkTest("button-icon-label", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);

  // A button's one child is a box holding the icon and the label, which the
  // theme spaces: 4px of border-spacing and 2px of label padding
  // (.image-text-button > box). The icon is centered vertically.
  // Text widths differ by a few pixels between browsers; main's 8px short.
  expect(Math.abs(contentWidth(web) - native.width)).toBeLessThanOrEqual(4);
  expect(contentHeight(web)).toBeCloseTo(native.height, 0);
  const [nativeBox, webBox] = [findChild(native, "box"), findChild(web, "box")];
  for (const name of ["image", "label"]) {
    const [n, w] = [findChild(nativeBox, name), findChild(webBox, name)];
    expect([w.x, w.y]).toEqual([expect.closeTo(n.x ?? 0, 0), expect.closeTo(n.y ?? 0, 0)]);
  }
});
