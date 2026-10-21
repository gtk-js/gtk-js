"use client";

import { GtkActionBar, GtkButton, GtkLabel } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkActionBar
      start={<GtkButton label="Cancel" />}
      centerWidget={<GtkLabel label="3 items selected" />}
      end={<GtkButton label="Apply" className="suggested-action" />}
    />
  );
}
