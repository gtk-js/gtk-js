import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: font_weight, background_color — host/inner-node bleed artifacts.
//
// font_weight: the banner root CSS node (adw-banner.c:495, css_name="banner")
// has no font-weight in SCSS. The bold weight comes from the inner title label
// which has class .heading (_toolbars.scss has no font-weight on `banner`).
// Native extraction reports the bold weight from the inner label on the root.
//
// background_color: per _toolbars.scss:238-240, background-color is set on
// `banner > revealer > widget`, not on the `banner` root. The outer node is
// transparent; native extraction captures the adw::Window host's white
// background through it.
gtkTest("banner-revealed", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => f.property !== "font_weight" && f.property !== "background_color"),
  ).toEqual([]);
});
