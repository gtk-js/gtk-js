import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The box's children, with the web's empty slots (0 wide) left out. */
function children(box: WidgetSnapshot): WidgetSnapshot[] {
  return (box.children ?? []).filter((child) => child.width > 0);
}

// GtkCenterLayout places the center child at (size - center) / 2 and only pushes
// it away from a side child when they would be closer than the spacing. In a
// wide box it stays centered.
gtkTest("center-box-toolbar-start-center-wide", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // gtk_widget_get_width() is the content width; the web snapshot measures the
  // border box.
  const webContent =
    web.width -
    web.padding.left -
    web.padding.right -
    web.border_widths.left -
    web.border_widths.right;
  gtkAssert.numbersEqual(native.width, webContent, "content width");
  const middle = (child: WidgetSnapshot) => (child.x ?? Number.NaN) + child.width / 2;
  gtkAssert.numbersClose(
    middle(children(native)[1]),
    middle(children(web)[1]),
    { tolerance: 1, reason: "GTK rounds the center position to whole pixels" },
    "center position",
  );
});
