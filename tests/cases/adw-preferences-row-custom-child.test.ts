import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** Native sizes are content boxes (gtk_widget_get_height()), web ones border boxes. */
const contentHeight = (s: WidgetSnapshot) =>
  s.height - s.padding.top - s.padding.bottom - s.border_widths.top - s.border_widths.bottom;

// AdwPreferencesRow shows its child, not its title, and is activatable by
// default like any GtkListBoxRow.
gtkTest("adw-preferences-row-custom-child", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const row = { native: findChild(native, "row"), web: findChild(web, "row") };
  expect(row.web.css_classes).toContain("activatable");
  expect(contentHeight(row.web)).toBeCloseTo(row.native.height, 0);
  expect(row.web.children?.length).toBe(1);
  const label = { native: findChild(native, "label"), web: findChild(web, "label") };
  expect(label.web.x).toBeCloseTo(label.native.x ?? 0, 0);
  expect(label.web.y).toBeCloseTo(label.native.y ?? 0, 0);
});
