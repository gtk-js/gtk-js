import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Native sizes are content boxes (gtk_widget_get_width()), web ones border boxes.
const outerWidth = (n: WidgetSnapshot) =>
  n.width + n.padding.left + n.padding.right + n.border_widths.left + n.border_widths.right;

// The native overlay is in a 300px AdwClamp. A toast is no wider than the
// overlay minus its 12px margins (allocate_toast()): its long title
// ellipsizes and the close button stays inside the overlay.
gtkTest("toast-overlay-narrow", (nativeRoot, web) => {
  const native = findChild(nativeRoot, "toastoverlay");
  gtkAssert.numbersEqual(native.width, web.width, "overlay width");
  gtkAssert.numbersEqual(native.height, web.height, "overlay height");
  const nativeToast = findChild(native, "toast");
  const webToast = findChild(web, "toast");
  // The toast node has no font-weight; native extraction reads its bold
  // .heading title's (inner-node bleed, as in banner-with-button).
  expect(
    compare(nativeToast, webToast).failures.filter((f) => f.property !== "font_weight"),
  ).toEqual([]);
  gtkAssert.numbersEqual(nativeToast.x!, webToast.x!, "toast x");
  gtkAssert.numbersEqual(nativeToast.y!, webToast.y!, "toast y");
  gtkAssert.numbersEqual(outerWidth(nativeToast), webToast.width, "toast width");
  const nativeClose = findChild(nativeToast, "button");
  const webClose = findChild(webToast, "button");
  gtkAssert.numbersEqual(nativeClose.x!, webClose.x!, "close button x");
  gtkAssert.numbersEqual(outerWidth(nativeClose), webClose.width, "close button width");
});
