import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The box's children, with the web's empty slots (0 wide) left out. */
function children(box: WidgetSnapshot): WidgetSnapshot[] {
  return (box.children ?? []).filter((child) => child.width > 0);
}

/** The space between two children. */
function gap(first: WidgetSnapshot, second: WidgetSnapshot): number {
  return (second.x ?? Number.NaN) - ((first.x ?? Number.NaN) + first.width);
}

// Centered, the center child would be closer than the spacing (.toolbar: 6px) to
// the end child, so GtkCenterLayout pushes it to end - spacing.
gtkTest("center-box-toolbar-center-end-narrow", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const [nativeCenter, nativeEnd] = children(native);
  const [webCenter, webEnd] = children(web);
  gtkAssert.numbersEqual(gap(nativeCenter, nativeEnd), gap(webCenter, webEnd), "spacing");
});
