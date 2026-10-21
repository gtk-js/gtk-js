"use client";

import { GtkBox, GtkLevelBar } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox orientation="vertical" spacing={12} style={{ width: 200 }}>
      <GtkLevelBar value={0.6} />
      <GtkLevelBar value={3} maxValue={5} mode="discrete" />
    </GtkBox>
  );
}
