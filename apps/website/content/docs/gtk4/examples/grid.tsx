"use client";

import { GtkButton, GtkGrid } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkGrid columnSpacing={8} rowSpacing={8} columnHomogeneous>
      {/* column/row/columnSpan are read by GtkGrid from child props for placement */}
      <GtkButton label="1" {...{ column: 0, row: 0 }} />
      <GtkButton label="2" {...{ column: 1, row: 0 }} />
      <GtkButton label="3" {...{ column: 0, row: 1, columnSpan: 2 }} />
    </GtkGrid>
  );
}
