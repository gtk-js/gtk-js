import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** Native sizes are content boxes (gtk_widget_get_height()), web ones border boxes. */
const contentHeight = (s: WidgetSnapshot) =>
  s.height - s.padding.top - s.padding.bottom - s.border_widths.top - s.border_widths.bottom;

// Only the header box and the title box are centered (adw-action-row.ui): a
// suffix without valign fills the row's height, as GTK's default valign=fill.
gtkTest("adw-action-row-suffix-fill", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const button = { native: findChild(native, "button"), web: findChild(web, "button") };
  expect(contentHeight(button.web)).toBeCloseTo(button.native.height, 0);
  expect(button.web.y).toBeCloseTo(button.native.y ?? 0, 0);
});
