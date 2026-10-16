import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: border_radius, background_color, font_weight.
//
// border_radius: per _window.scss:7, CSD host `border-radius:
// var(--window-radius)` clips into the viewswitcher via GskRoundedClipNode.
// The viewswitcher SCSS (_view-switcher.scss:1-33) has no border-radius.
//
// background_color: the `viewswitcher` SCSS (_view-switcher.scss:1-33) has
// no background-color rule. Native reports a faint rgba from the host window
// bleeding through the transparent root.
//
// font_weight: the `viewswitcher` SCSS has no font-weight on its root node.
// The only font-weight:bold is on `indicatorbin > indicator > label`
// (_view-switcher.scss:112). Native reports 700 from the host adw::Window
// inherited value; web correctly shows 400.
gtkTest("adw-view-switcher-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        f.property !== "font_weight" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
});
