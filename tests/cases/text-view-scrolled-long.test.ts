import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

// Text taller than the viewport: the scrolled window scrolls the text view's
// whole text, 30 lines of 18px (the native vadjustment's upper is 540). On
// the web the text view is that tall and the scrolled window scrolls it,
// rather than a viewport-sized <textarea> scrolling itself.
gtkTest("text-view-scrolled-long", (native, web) => {
  // The native GSK walker leaks the text view's background into the scrolled
  // window's snapshot (as with other containers); skip it at the root.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
  // Firefox's textarea comes out a pixel taller (541px) than Chromium's.
  expect(Math.abs(findChild(web, "textview").height - 30 * 18)).toBeLessThanOrEqual(2);
});
