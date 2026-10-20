"use client";

import { GtkFlowBox, GtkLabel } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkFlowBox columnSpacing={8} rowSpacing={8} maxChildrenPerLine={4} style={{ maxWidth: 300 }}>
      {["Red", "Green", "Blue", "Yellow", "Cyan", "Magenta"].map((color) => (
        <GtkLabel key={color} label={color} />
      ))}
    </GtkFlowBox>
  );
}
