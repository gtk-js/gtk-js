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

// Start and end only: one spacing (.toolbar: 6px) between them, in the vertical
// direction.
gtkTest("center-box-toolbar-vertical-start-end", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const [nativeStart, nativeEnd] = children(native);
  const [webStart, webEnd] = children(web);
  gtkAssert.numbersEqual(gap(nativeStart, nativeEnd), gap(webStart, webEnd), "spacing");
});
