import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** The y and height of the first label breadth-first (the content), in the view's coordinates. */
function contentPlace(view: WidgetSnapshot): { y: number; height: number } {
  const queue = (view.children ?? []).map((node) => ({ node, y: node.y ?? 0 }));
  for (let item = queue.shift(); item; item = queue.shift()) {
    const { node, y } = item;
    if (node.css_name === "label") return { y, height: node.height };
    const inner = y + node.border_widths.top + node.padding.top;
    for (const child of node.children ?? []) queue.push({ node: child, y: inner + (child.y ?? 0) });
  }
  throw new Error("no label");
}

// Content extended to the top edge gets the whole view, under the bars
// (adw_toolbar_view_size_allocate()), and two top bars collapse their spacing:
// the header bar is 40px instead of 46px (update_collapse_style()).
//
// border_radius and background_color: see adw-toolbar-view-with-bottom.
gtkTest("adw-toolbar-view-extend-two-bars", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => !f.property.startsWith("border_radius") && f.property !== "background_color",
    ),
  ).toEqual([]);
  gtkAssert.numbersEqual(native.height, web.height, "height");
  const nativeContent = contentPlace(native);
  const webContent = contentPlace(web);
  gtkAssert.numbersEqual(nativeContent.y, webContent.y, "content y");
  gtkAssert.numbersEqual(nativeContent.height, webContent.height, "content height");
  gtkAssert.numbersEqual(
    findChild(native, "headerbar").height,
    findChild(web, "headerbar").height,
    "header bar height",
  );
});
