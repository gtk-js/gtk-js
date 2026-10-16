import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: color — extraction-level structural mismatch + random color for empty text.
//
// Native AdwAvatar has a two-level structure (adw-avatar.c:467): the outer
// AdwAvatar widget (no CSS name) contains a child gizmo with CSS name "avatar"
// (adw_gizmo_new_with_role("avatar", ...)). The SCSS color rules target the
// gizmo: `avatar.color#{$i} { color: ... }` (_avatar.scss:27-32). The test
// extracts from the outer widget (use_inner=false), which has no avatar SCSS
// applied. The web component's root div IS the avatar node (class="gtk-avatar
// colorN"), so color is set. This structural mismatch causes color to differ.
//
// Additionally, both native (adw-avatar.c:137-139, g_rand_int_range) and web
// (Math.random) use random color selection when text is empty, so color can
// never match deterministically for this case.
gtkTest("avatar-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "color")).toEqual([]);
});
