import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: border_radius, background_color, font_weight, shadows — all
// CSD host / inner-node bleed on the outer preferencesgroup container.
//
// Same root cause as adw-preferences-group-default: preferencesgroup node
// (adw-preferences-group.c:315, GtkBinLayout at line 317) is transparent.
// %card styles (background, border-radius: $card_radius 12px, box-shadow)
// are on the inner list.boxed-list child (_lists.scss:513 ->
// _misc.scss:195-201). font_weight bleed from the bold .heading title label.
gtkTest("adw-preferences-group-with-description", (native, web) => {
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
