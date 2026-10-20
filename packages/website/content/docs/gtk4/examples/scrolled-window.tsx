"use client";

import { GtkLabel, GtkScrolledWindow } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkScrolledWindow
      hasFrame
      propagateNaturalHeight
      maxContentHeight={120}
      style={{ width: 250 }}
    >
      <GtkLabel label={Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join("\n")} wrap />
    </GtkScrolledWindow>
  );
}
