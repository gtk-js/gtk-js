"use client";

import { GtkButton, GtkCenterBox, GtkLabel } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkCenterBox
      startWidget={<GtkButton label="Back" />}
      centerWidget={<GtkLabel label="Title" />}
      endWidget={<GtkButton label="Forward" />}
    />
  );
}
