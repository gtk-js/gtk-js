import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("editable-label-editing-active", (native, web) => {
  // Native root picks up the text entry's white background_color (child leakage via
  // editablelabel > stack > text { background-color: var(--view-bg-color) }).
  // The root editablelabel has no background in GTK CSS. Skip at root.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
  // GtkText's natural width is NAT_ENTRY_WIDTH = 150px (gtk_text_measure()), not the
  // browser's size=20 input width.
  expect(web.width).toBeCloseTo(native.width, 0);
  expect(Math.abs(web.height - native.height)).toBeLessThanOrEqual(1);
  const [nativeText, webText] = [findChild(native, "text"), findChild(web, "text")];
  expect(webText.width).toBeCloseTo(nativeText.width, 0);
  expect(webText.x).toBeCloseTo(nativeText.x ?? 0, 0);
});
