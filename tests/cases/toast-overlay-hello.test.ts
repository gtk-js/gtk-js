import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Native sizes are content boxes (gtk_widget_get_width()), web ones border boxes.
const outerWidth = (n: WidgetSnapshot) =>
  n.width + n.padding.left + n.padding.right + n.border_widths.left + n.border_widths.right;

// The native overlay is in a 300px AdwClamp. The toast counts toward the
// overlay's height, margins included (adw_toast_overlay_measure()), and starts
// on a whole pixel, like allocate_toast()'s integer centering. Its width
// follows the title's text width, which differs between browsers, so its
// center is compared.
gtkTest("toast-overlay-hello", (nativeRoot, web) => {
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
  gtkAssert.numbersEqual(nativeToast.y!, webToast.y!, "toast y");
  expect(Math.abs(webToast.x! - Math.round(webToast.x!)), "toast x on a whole pixel").toBeLessThan(
    0.05,
  );
  gtkAssert.numbersClose(
    nativeToast.x! + outerWidth(nativeToast) / 2,
    webToast.x! + webToast.width / 2,
    { tolerance: 1, reason: "centers are floored to whole pixels; text widths differ" },
    "toast center",
  );
});
