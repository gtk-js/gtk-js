import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// Below the tightening threshold, on the eased curve and past it, rendered on
// the server: the child gets its clamped size (margins included) and is
// centered before any effect runs. Within a pixel: GTK floors the size and
// the centering offset, CSS approximates the curve.
gtkTest("clamp-sizes", (native, web) => {
  const opts = { tolerance: 1, reason: "GTK rounds to whole pixels" };
  for (const [i, clamp] of native.children!.entries()) {
    const [n, w] = [clamp.children![0]!, web.children![i]!.children![0]!];
    gtkAssert.numbersClose(clamp.width, web.children![i]!.width, opts, `clamp ${i} width`);
    gtkAssert.numbersClose(n.width, w.width, opts, `clamp ${i} child width`);
    gtkAssert.numbersClose(n.x!, w.x!, opts, `clamp ${i} child x`);
  }
});
