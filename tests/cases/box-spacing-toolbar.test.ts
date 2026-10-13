import { expect } from "bun:test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The space between the box's two children, given its content width. */
function gap(box: WidgetSnapshot, contentWidth: number): number {
  const children = box.children ?? [];
  expect(children.length).toBe(2);
  return contentWidth - children.reduce((sum, child) => sum + child.width, 0);
}

// GtkBoxLayout adds the box's spacing (6px) to the theme's border-spacing
// (.toolbar: 6px), see get_spacing() in gtkboxlayout.c.
gtkTest("box-spacing-toolbar", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // gtk_widget_get_width() is the content width; the web snapshot measures the
  // border box.
  const webContent =
    web.width -
    web.padding.left -
    web.padding.right -
    web.border_widths.left -
    web.border_widths.right;
  gtkAssert.numbersEqual(gap(native, native.width), gap(web, webContent), "gap");
});
