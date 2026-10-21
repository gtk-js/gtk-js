"use client";

import { GtkLabel, GtkListBox, GtkListBoxRow } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkListBox className="boxed-list" style={{ width: 250 }}>
      <GtkListBoxRow>
        <GtkLabel label="First item" />
      </GtkListBoxRow>
      <GtkListBoxRow>
        <GtkLabel label="Second item" />
      </GtkListBoxRow>
      <GtkListBoxRow>
        <GtkLabel label="Third item" />
      </GtkListBoxRow>
    </GtkListBox>
  );
}
