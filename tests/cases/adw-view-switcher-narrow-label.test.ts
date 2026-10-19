import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// The narrow label is 0.75rem, and GTK's rem is gtk-font-name's size (11pt),
// so the text is 11px. Against the browser's 16px root it was 12px, and the
// switcher, as wide as the label, ~13px wider.
gtkTest("adw-view-switcher-narrow-label", (native, web) => {
  gtkAssert.numbersClose(
    native.width,
    web.width,
    { tolerance: 6, reason: "bold text widths differ slightly between browsers" },
    "switcher width",
  );
});
