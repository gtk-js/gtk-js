"use client";

import { GtkFrame, GtkLabel } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkFrame label="Frame Title">
      <GtkLabel label="Content inside a frame" style={{ padding: 12 }} />
    </GtkFrame>
  );
}
