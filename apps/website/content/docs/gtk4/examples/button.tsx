"use client";

import { GtkBox, GtkButton } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox spacing={8} style={{ flexWrap: "wrap", justifyContent: "center" }}>
      <GtkButton label="Default" valign="center" />
      <GtkButton label="Suggested" className="suggested-action" valign="center" />
      <GtkButton label="Destructive" className="destructive-action" valign="center" />
      <GtkButton label="Flat" hasFrame={false} valign="center" />
      <GtkButton label="Pill" className="pill" valign="center" />
      <GtkButton label="C" className="circular" valign="center" />
    </GtkBox>
  );
}
