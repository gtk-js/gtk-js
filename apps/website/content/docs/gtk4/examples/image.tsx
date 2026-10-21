"use client";

import { GtkBox, GtkImage } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox spacing={12}>
      <GtkImage iconName="DialogInformation" iconSize="normal" />
      <GtkImage iconName="DialogInformation" iconSize="large" />
    </GtkBox>
  );
}
