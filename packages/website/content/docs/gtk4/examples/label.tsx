"use client";

import { GtkBox, GtkLabel } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox orientation="vertical" spacing={4}>
      <GtkLabel label="Title" className="title-1" />
      <GtkLabel label="This is body text in a GtkLabel." />
      <GtkLabel
        label='Text with <b>markup</b> and a <a href="https://gnome.org">link</a>'
        useMarkup
      />
      <GtkLabel label="Selectable text" selectable />
      <GtkLabel label="Dimmed caption" className="dimmed caption" />
    </GtkBox>
  );
}
