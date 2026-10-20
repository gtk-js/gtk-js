import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// GtkWindow gives its child the whole content area (_gtk_window_set_allocation()),
// where valign=center centers it.
gtkTest("window-child-valign-center", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures).toEqual([]);
  expect(web.width).toBeCloseTo(native.width, 0);
  expect(web.height).toBeCloseTo(native.height, 0);
  const [nativeLabel] = native.children ?? [];
  const [webLabel] = web.children ?? [];
  expect(webLabel?.height).toBeCloseTo(nativeLabel?.height ?? 0, 0);
  // Its center, not its top: natively (100 − 17) / 2.
  const center = (l?: { y?: number; height: number }) => (l?.y ?? 0) + (l?.height ?? 0) / 2;
  expect(Math.abs(center(webLabel) - center(nativeLabel))).toBeLessThanOrEqual(1);
});
