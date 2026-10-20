import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("progressbar-vertical-50", (native, web) => {
  // Root progressbar has no styled background in GTK CSS — the trough child has it.
  // Native GSK walker leaks trough's border_radius/background_color to root. Skip at root.
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  const nativeTrough = findChild(native, "trough");
  const webTrough = findChild(web, "trough");
  expect(compare(nativeTrough, webTrough).failures).toEqual([]);

  // A vertical bar's trough fills its height and the progress is the fraction
  // of it (gtk_progress_bar_set_orientation(), allocate_trough()).
  gtkAssert.numbersEqual(native.height, web.height, "height");
  for (const [n, w, name] of [
    [nativeTrough, webTrough, "trough"],
    [findChild(native, "progress"), findChild(web, "progress"), "progress"],
  ] as const) {
    for (const key of ["x", "y", "width", "height"] as const) {
      gtkAssert.numbersEqual(n[key] ?? 0, w[key] ?? 0, `${name} ${key}`);
    }
  }
});
