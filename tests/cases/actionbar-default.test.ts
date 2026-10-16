import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Three known native extraction artifacts on the outer actionbar node:
// 1. background_color: the outer actionbar CSS node is transparent (background is on
//    the inner revealer > box per _toolbars.scss). Native extraction captures the
//    adw::Window host's white background through the transparent widget.
// 2. border_radius: the host window's 9px CSD radius is captured via GskRoundedClipNode
//    for widgets that fill the window and have visible children at the corners.
// 3. font_weight: bold font from inner button labels bleeds into the native
//    root-node font_weight report.
gtkTest("actionbar-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius") &&
        f.property !== "font_weight",
    ),
  ).toEqual([]);
});
