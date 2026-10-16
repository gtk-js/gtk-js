import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Two known native extraction artifacts on the outer searchbar node:
// 1. background_color: the outer searchbar CSS node is transparent (background is on
//    the inner revealer > box per _toolbars.scss). Native extraction captures the
//    adw::Window host's white background through the transparent widget.
// 2. border_radius: the host window's 9px CSD radius is captured via GskRoundedClipNode
//    for widgets that fill the window and have visible children at the corners.
gtkTest("searchbar-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => f.property !== "background_color" && !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
});
