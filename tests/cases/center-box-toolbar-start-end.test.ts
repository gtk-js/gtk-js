import { expect } from "bun:test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The box's content width not taken by its children (empty slots are 0 wide). */
function spacing(box: WidgetSnapshot, contentWidth: number): number {
  return contentWidth - (box.children ?? []).reduce((sum, child) => sum + child.width, 0);
}

// GtkCenterLayout reserves (visible children - 1) × spacing (.toolbar: 6px).
// Start and end only: one spacing between them. The two children are the same
// size, as the natural width is 2 × the larger one plus the center.
gtkTest("center-box-toolbar-start-end", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // gtk_widget_get_width() is the content width; the web snapshot measures the
  // border box.
  const webContent =
    web.width -
    web.padding.left -
    web.padding.right -
    web.border_widths.left -
    web.border_widths.right;
  gtkAssert.numbersEqual(spacing(native, native.width), 6, "native spacing");
  // The natural width matches too (labels differ by a fraction of a pixel).
  gtkAssert.numbersClose(
    native.width,
    webContent,
    { tolerance: 1, reason: "glyph widths" },
    "width",
  );
  gtkAssert.numbersEqual(spacing(web, webContent), 6, "web spacing");
});
