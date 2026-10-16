import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: font_weight, background_color, border_radius — host/inner-node bleed.
//
// font_weight: the banner root (adw-banner.c:495, css_name="banner") has no
// font-weight in SCSS. Bold comes from the inner .heading title label.
//
// background_color: per _toolbars.scss:238-240, background-color is on
// `banner > revealer > widget`, not the `banner` root. The outer node is
// transparent; native extraction captures the adw::Window host's white
// background through it.
//
// border_radius: the banner fills the adw::Window edge-to-edge and captures
// the 9px CSD clip radius via GskRoundedClipNode (same artifact as
// actionbar-default).
gtkTest("banner-with-button", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "font_weight" &&
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
});
