import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// GtkHeaderBar's start and end boxes are plain horizontal GtkBoxes
// (gtk_header_bar_init()): in a header bar taller than its buttons, the window
// controls and their buttons fill the end box's height, as GtkBox children do
// unless their valign says otherwise, and the buttons' images stay centered
// (update_window_buttons() makes them valign/halign GTK_ALIGN_CENTER).
gtkTest("headerbar-tall-controls", (native, web) => {
  // Native sizes are the content box's, web ones the border box's.
  const contentHeight = (s: typeof web) =>
    s.height - s.padding.top - s.padding.bottom - s.border_widths.top - s.border_widths.bottom;
  for (const name of ["windowcontrols", "button", "image"]) {
    const n = findChild(native, name);
    const w = findChild(web, name);
    gtkAssert.numbersEqual(n.height, contentHeight(w), `${name} height`);
    gtkAssert.numbersEqual(n.y!, w.y!, `${name} y`);
  }
});
