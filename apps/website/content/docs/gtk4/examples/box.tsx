"use client";

import { GtkBox, GtkButton } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox spacing={8}>
      <GtkButton label="One" />
      <GtkButton label="Two" />
      <GtkButton label="Three" />
    </GtkBox>
  );
}
