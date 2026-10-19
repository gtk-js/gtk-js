import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

gtkTest("menu-button-label-up", (native, web) => {
  // The theme draws on the button; the menubutton is only its container.
  const button = (tree: WidgetSnapshot) => findChild(tree, "button", 0);
  expect(compare(button(native), button(web)).failures).toEqual([]);

  // The arrow follows the label in a box that .arrow-button spaces 4px
  // (gtk_menu_button_set_label()), centered in the button's height.
  expect(Math.abs(web.width - native.width)).toBeLessThan(5);
  // Firefox's text widths are fractional and its element rects single
  // precision, so these differences can be off by ~1e-4px, depending on where
  // the case sits in the gallery: compare to a thousandth of a pixel.
  for (const tree of [native, web]) {
    const [box, label, arrow] = ["box", "label", "arrow"].map((name) => findChild(tree, name));
    expect(arrow.x! - label.x! - label.width).toBeCloseTo(4, 3);
    expect(box.width - arrow.x! - arrow.width).toBeCloseTo(0, 3);
  }
  const [n, w] = [findChild(native, "arrow"), findChild(web, "arrow")];
  expect([w.y, w.width, w.height]).toEqual([n.y, n.width, n.height]);
});
