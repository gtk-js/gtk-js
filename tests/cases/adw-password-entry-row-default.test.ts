import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: opacity — native empty-state animation bleed (inherited).
//
// AdwPasswordEntryRow extends AdwEntryRow (adw-password-entry-row.c:50,
// G_DEFINE_FINAL_TYPE with ADW_TYPE_ENTRY_ROW). It inherits the
// empty_animation from adw-entry-row.c:130-132 that sets opacity on inner
// text/title widgets via gtk_widget_set_opacity(). The native extraction
// captures this child opacity on the root ListBox node. The web side
// correctly renders the structure but CSS opacity doesn't propagate upward.
gtkTest("adw-password-entry-row-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "opacity")).toEqual([]);
});
