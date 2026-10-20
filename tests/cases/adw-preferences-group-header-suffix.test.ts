import { expect } from "vite-plus/test";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

// The header suffix keeps GtkWidget:valign's default, fill: it is as tall as
// the two-line header. Only the labels box is centered
// (adw-preferences-group.ui). Native sizes are content-box ones, web ones
// border-box.
gtkTest("adw-preferences-group-header-suffix", (native, web) => {
  const slack = (group: WidgetSnapshot, contentBox: boolean) => {
    const header = findChild(group, "box", 1);
    const suffix = findChild(group, "button");
    const insets = contentBox
      ? suffix.padding.top +
        suffix.padding.bottom +
        suffix.border_widths.top +
        suffix.border_widths.bottom
      : 0;
    return header.height - (suffix.height + insets);
  };
  expect(slack(native, true)).toBeCloseTo(0, 0);
  expect(slack(web, false)).toBeCloseTo(0, 0);
});
