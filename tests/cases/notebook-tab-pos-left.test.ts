import { expect } from "vite-plus/test";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Native sizes are content-box ones, web ones border-box.
const outerWidth = (n: WidgetSnapshot) =>
  n.width + n.padding.left + n.padding.right + n.border_widths.left + n.border_widths.right;
const outerHeight = (n: WidgetSnapshot) =>
  n.height + n.padding.top + n.padding.bottom + n.border_widths.top + n.border_widths.bottom;

gtkTest("notebook-tab-pos-left", (native, web) => {
  // Side tabs make the notebook a horizontal box and the header a vertical one
  // (gtk_notebook_update_tab_pos()): the header runs down the left side, the
  // stack beside it.
  const header = { native: findChild(native, "header"), web: findChild(web, "header") };
  const stack = { native: findChild(native, "stack"), web: findChild(web, "stack") };
  expect([header.web.x, header.web.y]).toEqual([0, 0]);
  expect(header.web.height).toBeCloseTo(outerHeight(header.native), 0);
  // The header is as wide as its widest label: allow for text widths.
  expect(Math.abs(header.web.width - outerWidth(header.native))).toBeLessThanOrEqual(5);
  expect(stack.web.x).toBeCloseTo(header.web.width, 0);
  expect(stack.web.y).toBe(0);
  expect(stack.web.height).toBeCloseTo(stack.native.height, 0);

  // The tabs are stacked from the top, each as wide as the header.
  for (let i = 0; i < 3; i++) {
    const n = findChild(native, "tab", i);
    const w = findChild(web, "tab", i);
    expect([w.x, w.y, w.height]).toEqual([n.x, n.y, outerHeight(n)]);
  }
});
