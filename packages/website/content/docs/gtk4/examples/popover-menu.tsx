"use client";

import { GtkMenuButton, type GtkMenuModel } from "@gtk-js/gtk4";

const menu: GtkMenuModel = [
  [
    { label: "_New Window", accel: "<Control>n" },
    { label: "_Preferences", accel: "<Control>comma" },
  ],
  [{ label: "_Keyboard Shortcuts", disabled: true }, { label: "_About Example" }],
];

export default function Example() {
  return <GtkMenuButton iconName="OpenMenu" hasFrame={false} menuModel={menu} />;
}
