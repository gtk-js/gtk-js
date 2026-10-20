import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// Rendered on the server: the slider sits at the value's fraction of the
// trough, less its margin box (gtk_range_compute_slider_position()), and the
// highlight covers that fraction from the start, or from the end when
// inverted (gtk_range_allocate_trough()), before any effect runs.
gtkTest("scale-positions", (native, web) => {
  const opts = { tolerance: 1, reason: "GTK rounds positions to whole pixels" };
  for (const [i, scale] of native.children!.entries()) {
    const webScale = web.children![i]!;
    for (const node of ["trough", "slider", "highlight"]) {
      const [n, w] = [findChild(scale, node), findChild(webScale, node)];
      gtkAssert.numbersClose(n.x!, w.x!, opts, `scale ${i} ${node} x`);
      gtkAssert.numbersClose(n.width, w.width, opts, `scale ${i} ${node} width`);
    }
  }
});
