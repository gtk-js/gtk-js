"use client";

import { GtkBox, GtkLabel, GtkSeparator } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox spacing={8}>
      <GtkLabel label="Left" />
      <GtkSeparator orientation="vertical" />
      <GtkLabel label="Right" />
    </GtkBox>
  );
}
