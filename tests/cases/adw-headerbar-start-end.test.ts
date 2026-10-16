import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: border_radius, font_weight, inset_shadows.
//
// border_radius: per _window.scss:7, `window.csd` gets `border-radius:
// var(--window-radius)` (12px). The native CSD host clips the headerbar to
// its rounded corners via GskRoundedClipNode, reporting 9px at the headerbar
// level. The headerbar SCSS has no border-radius of its own.
//
// font_weight: per _header-bar.scss:200-207, font-weight:bold is only on the
// `.title` child, not the `headerbar` root. Native reports the computed
// inherited 700; web correctly shows 400 at the root.
//
// inset_shadows: per _header-bar.scss:5-7, headerbar has inset box-shadows.
// Web CSS includes them (adwaita.css:2787), but native GSK extraction doesn't
// capture GskInsetShadowNode — same limitation as headerbar-default.test.ts.
gtkTest("adw-headerbar-start-end", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "font_weight" &&
        !f.property.startsWith("border_radius") &&
        !f.property.startsWith("inset_shadows"),
    ),
  ).toEqual([]);
});
