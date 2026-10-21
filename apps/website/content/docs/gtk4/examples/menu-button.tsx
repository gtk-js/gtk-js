"use client";

import { GtkLabel, GtkMenuButton } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkMenuButton
      iconName="OpenMenu"
      hasFrame={false}
      popover={<GtkLabel label="Menu content goes here" style={{ padding: 12 }} />}
    />
  );
}
