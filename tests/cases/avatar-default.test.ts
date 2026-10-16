import { expect } from "bun:test";
import { compare, gtkTest } from "../harness";

// Both sides extract the `avatar` gizmo inside AdwAvatar (adw-avatar.c:467),
// the node the SCSS styles (_avatar.scss).
//
// Filtered: color. Empty text picks a random palette color on both sides
// (adw-avatar.c:137-139, Math.random), so it can't match deterministically.
gtkTest("avatar-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "color")).toEqual([]);
});
