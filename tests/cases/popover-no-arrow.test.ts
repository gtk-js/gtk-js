import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// Without an arrow the contents start at the popover's edge: GTK leaves no
// TAIL_HEIGHT gap for it (gtk_popover_size_allocate()).
gtkTest("popover-no-arrow", (native, web) => {
  const webPopover = findChild(web, "popover");
  const webContents = findChild(webPopover, "contents");
  gtkAssert.numbersEqual(
    findChild(findChild(native, "popover"), "contents").y ?? NaN,
    webContents.y ?? NaN,
    "contents y",
  );
  gtkAssert.numbersEqual(webContents.height, webPopover.height, "popover height");
});
