"use client";

import { GtkButton, GtkLabel, GtkOverlay } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkOverlay
      child={<GtkLabel label="Base content" style={{ padding: 32 }} />}
      overlays={[
        <GtkButton
          key="badge"
          label="Badge"
          className="suggested-action pill"
          halign="end"
          valign="start"
        />,
      ]}
    />
  );
}
