"use client";

import { AdwHeaderBar } from "@gtk-js/adwaita";
import { GtkWindowTitle } from "@gtk-js/gtk4";

export default function Example() {
  return <AdwHeaderBar titleWidget={<GtkWindowTitle title="My App" />} showBackButton={false} />;
}
