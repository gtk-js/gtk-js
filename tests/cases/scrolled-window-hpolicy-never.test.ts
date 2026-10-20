import { expect } from "vite-plus/test";
import { findChild, gtkTest } from "../harness";

// With the never policy a scrolled window is at least as wide as its child
// (gtk_scrolled_window_measure()), even in a narrower box: its viewport isn't
// narrower than the label.
gtkTest("scrolled-window-hpolicy-never", (native, web) => {
  const overhang = (tree: typeof native) =>
    findChild(tree, "viewport").width - findChild(tree, "label").width;
  expect(overhang(web)).toBeCloseTo(overhang(native), 0);
});
