import { gtkTest } from "../harness";

// Both sides extract the `avatar` gizmo inside AdwAvatar (adw-avatar.c:467),
// the node the SCSS styles (_avatar.scss).
gtkTest("avatar-small");
