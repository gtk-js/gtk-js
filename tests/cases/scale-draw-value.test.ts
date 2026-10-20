import { gtkAssert } from "../assert";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** A node's center along x, in its parent's content box. */
function centerX(s: WidgetSnapshot): number {
  return (s.x ?? 0) + s.width / 2;
}

// The value label sits above the trough, centered on the slider; the trough
// keeps the scale's full width.
gtkTest("scale-draw-value", (native, web) => {
  gtkAssert.numbersEqual(
    native.height,
    web.height - web.padding.top - web.padding.bottom,
    "height",
  );
  const nativeValue = findChild(native, "value");
  const webValue = findChild(web, "value");
  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  const nativeTrough = findChild(native, "trough");
  const webTrough = findChild(web, "trough");
  for (const key of ["x", "y", "width", "height"] as const) {
    gtkAssert.numbersEqual(nativeTrough[key] ?? 0, webTrough[key] ?? 0, `trough ${key}`);
  }
  gtkAssert.numbersEqual(nativeValue.y ?? 0, webValue.y ?? 0, "value y");
  gtkAssert.numbersEqual(nativeValue.height, webValue.height, "value height");
  gtkAssert.numbersClose(
    (nativeTrough.x ?? 0) + centerX(nativeSlider),
    centerX(nativeValue),
    { tolerance: 1, reason: "GTK rounds the label's x to whole pixels" },
    "native value centered on the slider",
  );
  gtkAssert.numbersClose(
    (webTrough.x ?? 0) + centerX(webSlider),
    centerX(webValue),
    { tolerance: 0.5, reason: "default" },
    "web value centered on the slider",
  );
});
