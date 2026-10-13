import { expect } from "bun:test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The box's children, with the web's empty slots left out. */
function children(box: WidgetSnapshot): WidgetSnapshot[] {
  return (box.children ?? []).filter((child) => child.width > 0 && child.height > 0);
}

/** The vertical space between two children. */
function gap(first: WidgetSnapshot, second: WidgetSnapshot): number {
  return (second.y ?? Number.NaN) - ((first.y ?? Number.NaN) + first.height);
}

// Vertically centered, the center child would be closer than the spacing
// (.toolbar: 6px) to the start child, so GtkCenterLayout pushes it to start +
// spacing.
gtkTest("center-box-toolbar-vertical-start-center-narrow", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const [nativeStart, nativeCenter] = children(native);
  const [webStart, webCenter] = children(web);
  gtkAssert.numbersEqual(gap(nativeStart, nativeCenter), gap(webStart, webCenter), "spacing");
});
