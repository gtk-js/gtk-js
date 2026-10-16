import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: background_color, font_weight, color, border_radius — host/inner bleed.
//
// Same artifacts as status-page-default. The statuspage root CSS node
// (adw-status-page.c:285, css_name="statuspage") has no background,
// font-weight, color, or border-radius in SCSS (_misc.scss:126-151).
// All styling targets descendants; native extraction captures host window
// background (white), inner label bold/color, and CSD 9px clip radius.
gtkTest("status-page-no-icon", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        f.property !== "font_weight" &&
        f.property !== "color" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
});
