"use client";

import { GtkBox, GtkProgressBar } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox orientation="vertical" spacing={12} style={{ width: 250 }}>
      <GtkProgressBar fraction={0.4} />
      <GtkProgressBar fraction={0.7} showText />
    </GtkBox>
  );
}
