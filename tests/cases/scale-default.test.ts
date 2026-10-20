import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** The web border box minus padding: native sizes are content boxes. */
function contentHeight(web: WidgetSnapshot): number {
  return web.height - web.padding.top - web.padding.bottom;
}

gtkTest("scale-default", (native, web) => {
  // Native root picks up trough background/rounded corners/shadows from child nodes.
  // Skip those leaked root properties and keep all other properties strict.
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius") &&
        !f.property.startsWith("shadows"),
    ),
  ).toEqual([]);

  const nativeSlider = findChild(native, "slider");
  const webSlider = findChild(web, "slider");
  expect(compare(nativeSlider, webSlider).failures).toEqual([]);

  // Content-box min-height 10px, the 4px trough (the slider's margin box)
  // centered in it, and the slider placed by gtk_range_compute_slider_position().
  gtkAssert.numbersEqual(native.height, contentHeight(web), "scale content height");
  const nativeTrough = findChild(native, "trough");
  const webTrough = findChild(web, "trough");
  for (const key of ["x", "y", "width", "height"] as const) {
    gtkAssert.numbersEqual(nativeTrough[key] ?? 0, webTrough[key] ?? 0, `trough ${key}`);
    gtkAssert.numbersEqual(nativeSlider[key] ?? 0, webSlider[key] ?? 0, `slider ${key}`);
  }
});
