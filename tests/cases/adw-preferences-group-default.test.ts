import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: border_radius, background_color, font_weight, shadows — all
// CSD host / inner-node bleed on the outer preferencesgroup container.
//
// The preferencesgroup CSS node (adw-preferences-group.c:315,
// css_name="preferencesgroup") uses GtkBinLayout (line 317) and has no
// background, radius, or shadows in _preferences.scss. Those properties
// belong to the inner list.boxed-list child which extends %card
// (_lists.scss:513 -> _misc.scss:195-201: background-color: var(--card-bg-color),
// border-radius: $card_radius (12px), box-shadow with 3 layers). Native
// extraction captures them on the transparent root via GskRoundedClipNode
// and GskOutsetShadowNode traversal.
//
// font_weight: the .heading title label (rendered with h4 class via
// preferencesgroup > box > box.header > box.labels > label) is bold;
// this bleeds into the root node font_weight report.
gtkTest("adw-preferences-group-default", (native, web) => {
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
