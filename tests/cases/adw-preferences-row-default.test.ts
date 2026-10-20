import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** Native sizes are content boxes (gtk_widget_get_height()), web ones border boxes. */
const contentHeight = (s: WidgetSnapshot) =>
  s.height - s.padding.top - s.padding.bottom - s.border_widths.top - s.border_widths.bottom;

// The title isn't shown: a row without a child is empty (adw-preferences-row.c).
gtkTest("adw-preferences-row-default", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  expect(contentHeight(findChild(web, "row"))).toBeCloseTo(findChild(native, "row").height, 0);
});
