import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// Given more room, the action button takes it (it expands), and the arrow
// stays at the end.
gtkTest("split-button-fill", (native, web) => {
  gtkAssert.numbersEqual(native.width, web.width, "width");
  const nativeMain = native.children![0]!;
  const webMain = web.children![0]!;
  // Native sizes are content-box ones, web ones border-box.
  gtkAssert.numbersEqual(
    nativeMain.width + nativeMain.padding.left + nativeMain.padding.right,
    webMain.width,
    "button width",
  );
  gtkAssert.numbersEqual(native.children![2]!.x!, web.children![2]!.x!, "menu button x");
});
