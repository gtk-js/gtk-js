import { gtkTest } from "../harness";

// The web component has the same two levels as native AdwAvatar
// (adw-avatar.c:467): the outer widget, which both sides extract, and the
// `avatar` gizmo inside it that the SCSS colors (_avatar.scss:27-35).
gtkTest("avatar-small");
