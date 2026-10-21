"use client";

import { AdwButtonContent } from "@gtk-js/adwaita";
import { GtkButton } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkButton>
      <AdwButtonContent iconName="DocumentOpen" label="Open" />
    </GtkButton>
  );
}
