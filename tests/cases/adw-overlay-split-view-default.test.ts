import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: background_color.
//
// background_color: the `overlay-split-view` CSS node has no background-color
// in the SCSS — the only relevant rule is `navigation-view,
// overlay-split-view { @include transition-shadows(); }` in _misc.scss:232-234
// which adds transition shadows, not a background. In non-collapsed mode
// (this test), per adw-overlay-split-view.c:735-737, children get
// `.sidebar-pane` / `.content-pane` classes — but the root node itself is
// transparent. Native reports rgba(0.92,0.92,0.93,1) from the host
// adw::Window background bleeding through the transparent root.
gtkTest("adw-overlay-split-view-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
});
