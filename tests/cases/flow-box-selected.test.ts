import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

const content = ({ width, height, padding: p }: WidgetSnapshot, web: boolean) =>
  web ? [width - p.left - p.right, height - p.top - p.bottom] : [width, height];

// The selected flowboxchild is the flow box's own child, so the theme's
// `flowbox > flowboxchild:selected` (padding, radius, background) applies.
// Text widths differ a little between browsers, so geometry allows a few pixels.
// The native flowbox node reports the selected child's background and radius,
// which it doesn't have itself (inner bleed).
gtkTest("flow-box-selected", (native, web) => {
  expect(
    compare(native, web).failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
  for (const i of [0, 1, 2]) {
    const n = findChild(native, "flowboxchild", i);
    const w = findChild(web, "flowboxchild", i);
    expect(compare(n, w).failures).toEqual([]);
    const nBox = [n.x ?? 0, n.y ?? 0, ...content(n, false)];
    [w.x ?? 0, w.y ?? 0, ...content(w, true)].forEach((v, j) =>
      expect(Math.abs(v - nBox[j]!)).toBeLessThanOrEqual(4),
    );
  }
});
