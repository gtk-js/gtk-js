import { expect } from "vite-plus/test";
import { findChild, gtkTest } from "../harness";

// The range fills the scrollbar and the trough the range, and the slider sits
// 30% of the way along the trough (gtk_range_compute_slider_position()).
gtkTest("scrollbar-value", (native, web) => {
  const trough = (tree: typeof native) => findChild(tree, "trough");
  for (const key of ["x", "y", "width", "height"] as const) {
    expect(trough(web)[key], `trough ${key}`).toBeCloseTo(trough(native)[key] ?? 0, 0);
  }
  const slider = (tree: typeof native) => findChild(tree, "slider");
  expect(slider(web).y).toBeCloseTo(slider(native).y ?? 0, 0);
});
