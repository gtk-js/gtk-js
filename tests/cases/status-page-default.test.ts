import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: background_color, font_weight, color, border_radius, opacity — host/inner bleed.
//
// The statuspage root CSS node (adw-status-page.c:285, css_name="statuspage")
// has no background, font-weight, color, border-radius, or opacity in SCSS. Per
// _misc.scss:126-151, all styling is on descendants:
//   - `statuspage > scrolledwindow > viewport > box > clamp > box > .title`
//     extends .title-1 (bold font-weight bleeds into root extraction)
//   - inner labels have dark text color (bleeds into root)
//   - no background-color on root (host window white bleeds through)
//   - no border-radius on root (9px CSD clip from host window's
//     GskRoundedClipNode)
//   - opacity ~0.44 on root: bleed from --dim-opacity applied to child icon/labels
gtkTest("status-page-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        f.property !== "font_weight" &&
        f.property !== "color" &&
        f.property !== "opacity" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
});
