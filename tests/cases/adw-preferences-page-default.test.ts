import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: border_radius, background_color, font_weight, shadows — all
// CSD host / inner-node bleed on the outer preferencespage container.
//
// The preferencespage CSS node (adw-preferences-page.c:279,
// css_name="preferencespage") uses GtkBoxLayout (line 281) and has no
// background, radius, or shadows in _preferences.scss (lines 1-4 only
// define margin/border-spacing on the inner clamp > box). Those properties
// belong to the nested list.boxed-list inside PreferencesGroup which extends
// %card (_lists.scss:513 -> _misc.scss:195-201). Native extraction captures
// them on the transparent root via GskRoundedClipNode traversal.
//
// font_weight: bold .heading title from inner PreferencesGroup bleeds into
// the root node font_weight report.
gtkTest("adw-preferences-page-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        !f.property.startsWith("border_radius") &&
        f.property !== "background_color" &&
        f.property !== "font_weight" &&
        !f.property.startsWith("shadows"),
    ),
  ).toEqual([]);
});
