"use client";

import { AdwAvatar } from "@gtk-js/adwaita";
import { GtkBox } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkBox spacing={12}>
      <AdwAvatar text="Alice Smith" showInitials size={48} />
      <AdwAvatar text="Bob Jones" showInitials size={48} />
      <AdwAvatar size={48} />
    </GtkBox>
  );
}
