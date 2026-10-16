import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: border_radius, background_color.
//
// border_radius: per _window.scss:7, the CSD host has `border-radius:
// var(--window-radius)`. The native GskRoundedClipNode clips the toolbarview
// to the window's rounded corners (9px), but the toolbarview SCSS
// (_toolbars.scss:259-329) has no border-radius rule of its own.
//
// background_color: the `toolbarview` SCSS selector (_toolbars.scss:259-329)
// has no background-color on the root node — only `.top-bar.raised` and
// `.bottom-bar.raised` children get background-color (line 283). The native
// extraction reports rgba(0,0,0.02,0.08) from the host window's color
// bleeding through the transparent root.
gtkTest("adw-toolbar-view-with-bottom", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) => !f.property.startsWith("border_radius") && f.property !== "background_color",
    ),
  ).toEqual([]);
});
