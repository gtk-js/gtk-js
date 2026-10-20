import { expect } from "vite-plus/test";
import { gtkTest } from "../harness";

gtkTest("notebook-homogeneous", (native, web) => {
  // GtkNotebook's stack holds every page and is homogeneous: showing the small
  // page, the notebook is still as large as the large one. Native sizes are
  // content-box ones, web ones border-box.
  const inner = (side: "left" | "right" | "top" | "bottom") => web.border_widths[side];
  expect(web.width - inner("left") - inner("right")).toBeCloseTo(native.width, 0);
  expect(web.height - inner("top") - inner("bottom")).toBeCloseTo(native.height, 0);
});
