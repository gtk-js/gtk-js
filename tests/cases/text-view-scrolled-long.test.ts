import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

// Text taller than the viewport, 30 lines of 18px (the native vadjustment's
// upper is 540). A GtkTextView is a GtkScrollable: the scrolled window
// allocates it its viewport and the view scrolls its own text, as the web's
// <textarea> does in GtkScrolledWindow's overlay-scrollbar layout.
gtkTest("text-view-scrolled-long", (native, web) => {
  // The native GSK walker leaks the text view's background into the scrolled
  // window's snapshot (as with other containers); skip it at the root.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
  // Both fill the viewport: the native size is the content box, the web one the
  // border box, inside the frame's 1px borders.
  expect(findChild(native, "textview").height).toBe(native.height);
  expect(findChild(web, "textview").height).toBe(
    web.height - web.border_widths.top - web.border_widths.bottom,
  );
});
