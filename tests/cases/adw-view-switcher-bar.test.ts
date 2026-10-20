import { gtkAssert } from "../assert";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** A node's border box relative to the tree's root, from the children's content-box offsets. */
function locate(
  tree: WidgetSnapshot,
  cssName: string,
): { node: WidgetSnapshot; x: number; y: number } {
  const queue = [{ node: tree, x: 0, y: 0 }];
  while (queue.length > 0) {
    const { node, x, y } = queue.shift()!;
    if (node !== tree && node.css_name === cssName) return { node, x, y };
    const cx = x + node.padding.left + node.border_widths.left;
    const cy = y + node.padding.top + node.border_widths.top;
    for (const child of node.children ?? []) {
      queue.push({ node: child, x: cx + (child.x ?? 0), y: cy + (child.y ?? 0) });
    }
  }
  throw new Error(`no ${cssName}`);
}

// AdwViewSwitcherBar: a GtkActionBar whose center widget is a narrow switcher
// 10px from its sides; the theme pads the action bar's box 7px at the top.
gtkTest("adw-view-switcher-bar", (native, web) => {
  gtkAssert.numbersEqual(native.width, web.width, "bar width");
  gtkAssert.numbersEqual(native.height, web.height, "bar height");
  const nbox = findChild(findChild(native, "revealer"), "box");
  const wbox = findChild(findChild(web, "revealer"), "box");
  gtkAssert.sidesEqual(nbox.padding, wbox.padding, "action bar box padding");
  gtkAssert.colorsEqual(nbox.background_color, wbox.background_color, "action bar background");
  const n = locate(native, "viewswitcher");
  const w = locate(web, "viewswitcher");
  gtkAssert.numbersEqual(n.x, w.x, "switcher x");
  gtkAssert.numbersEqual(n.y, w.y, "switcher y");
  gtkAssert.numbersEqual(n.node.width, w.node.width, "switcher width");
  gtkAssert.numbersEqual(n.node.height, w.node.height, "switcher height");
});
