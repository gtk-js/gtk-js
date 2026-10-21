"use client";

import { GtkExpander, GtkLabel } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkExpander label="Details">
      <GtkLabel label="Here is some additional information." />
    </GtkExpander>
  );
}
