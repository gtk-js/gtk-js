import { expect } from "vite-plus/test";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** A descendant's border box in the root's coordinates, found breadth-first by CSS name. */
function locate(root: WidgetSnapshot, cssName: string) {
  const queue = [{ node: root, x: 0, y: 0 }];
  while (queue.length > 0) {
    const { node, x, y } = queue.shift()!;
    for (const child of node.children ?? []) {
      const cx = x + node.border_widths.left + node.padding.left + (child.x ?? 0);
      const cy = y + node.border_widths.top + node.padding.top + (child.y ?? 0);
      if (child.css_name === cssName) return { node: child, x: cx, y: cy };
      queue.push({ node: child, x: cx, y: cy });
    }
  }
  throw new Error(`no ${cssName} node`);
}

// Two known native extraction artifacts on the outer searchbar node:
// 1. background_color: the outer searchbar CSS node is transparent (background is on
//    the inner revealer > box per _toolbars.scss). Native extraction captures the
//    adw::Window host's white background through the transparent widget.
// 2. border_radius: the host window's 9px CSD radius is captured via GskRoundedClipNode
//    for widgets that fill the window and have visible children at the corners.
gtkTest("searchbar-with-close-button", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  // The box is a GtkCenterBox: the entry is centered, the close button is the
  // end widget, a valign=center circle (gtk_search_bar_init()). The native
  // tree's child positions aren't comparable (the windows differ in width),
  // so the layout is checked on the web side.
  const box = locate(web, "box");
  const boxWidth = box.node.width - box.node.padding.left - box.node.padding.right;
  const boxHeight = box.node.height - box.node.padding.top - box.node.padding.bottom;
  // Positions in the box's content box.
  const inBox = (name: string) => {
    const { node, x, y } = locate(box.node, name);
    return { node, x: x - box.node.padding.left, y: y - box.node.padding.top };
  };
  const entry = inBox("entry");
  expect(entry.x + entry.node.width / 2).toBeCloseTo(boxWidth / 2, 0);

  const close = inBox("button");
  expect(close.node.css_classes).toContain("image-button");
  expect(close.y + close.node.height / 2).toBeCloseTo(boxHeight / 2, 0);
  // At the end, inside its 4px end margin (_toolbars.scss).
  expect(boxWidth - (close.x + close.node.width)).toBeCloseTo(4, 0);
  // The native snapshot's size is the button's content box.
  const nativeClose = locate(native, "button").node;
  const pad = close.node.padding;
  expect(close.node.width - pad.left - pad.right).toBeCloseTo(nativeClose.width, 0);
  expect(close.node.height - pad.top - pad.bottom).toBeCloseTo(nativeClose.height, 0);
});
