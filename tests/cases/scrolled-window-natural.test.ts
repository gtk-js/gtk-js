import { expect } from "vite-plus/test";
import { findChild, gtkTest } from "../harness";

// A scrolled window doesn't take its content's height unless it propagates
// it: it is as tall as its scrollbar's minimum (gtk_scrolled_window_measure()).
gtkTest("scrolled-window-natural", (native, web) => {
  expect(findChild(web, "viewport").height).toBeCloseTo(findChild(native, "viewport").height, 0);
});
