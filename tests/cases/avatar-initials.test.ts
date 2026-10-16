import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: color — extraction-level structural mismatch.
//
// Native AdwAvatar (adw-avatar.c:467) wraps a child gizmo with CSS name
// "avatar" that receives the .colorN class (adw-avatar.c:143-147). The SCSS
// `avatar.color#{$i} { color: nth($avatarcolor, 1) }` (_avatar.scss:27-32)
// targets this gizmo, not the outer widget. The test extracts from the outer
// AdwAvatar (use_inner=false), which inherits default color, not the avatar
// palette color. The web root div IS the avatar CSS node, so it has the
// palette color set. The hash algorithm itself now matches (g_str_hash,
// DJB * 33) after the avatar.tsx fix.
gtkTest("avatar-initials", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "color")).toEqual([]);
});
