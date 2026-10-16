import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: color — same extraction-level structural mismatch as avatar-initials.
//
// Native AdwAvatar outer widget has no avatar CSS name; the child gizmo does
// (adw-avatar.c:467). SCSS `avatar.color#{$i} { color: ... }` (_avatar.scss:
// 27-32) and `avatar.contrasted { color: white }` (_avatar.scss:35) target
// the gizmo. The small variant (size=24 < 25) adds .contrasted on the gizmo
// (adw-avatar.c:758). Test extracts from the outer widget which lacks these
// styles. Web root div IS the avatar CSS node.
gtkTest("avatar-small", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "color")).toEqual([]);
});
