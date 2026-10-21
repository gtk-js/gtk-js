"use client";

import { GtkBox, GtkSpinner } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox spacing={16}>
      <GtkSpinner spinning />
      <GtkSpinner />
    </GtkBox>
  );
}
