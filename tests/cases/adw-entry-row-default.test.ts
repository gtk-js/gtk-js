import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

// Filtered: opacity — native empty-state animation bleed.
//
// adw-entry-row.c:130-132 runs an empty_animation that calls
// gtk_widget_set_opacity() on the inner text/title/empty_title widgets.
// When the row is empty and unfocused, empty_progress=0 so text+title
// opacity is ~0 (adw-entry-row.c:18, EMPTY_ANIMATION_DURATION=150ms,
// value_to=0). The native extraction captures this child opacity on the
// root ListBox node. The web side correctly renders the structure but
// CSS opacity doesn't propagate upward to the parent.
gtkTest("adw-entry-row-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "opacity")).toEqual([]);
  // Even while the row is empty, its text fills the editable area's height
  // (allocate_editable_area()), so the pointer is an I-beam all over it.
  expect(findChild(web, "text").height).toBeCloseTo(findChild(native, "text").height, 0);
});
