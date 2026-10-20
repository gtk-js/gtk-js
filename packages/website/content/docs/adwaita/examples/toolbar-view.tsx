"use client";

import { AdwHeaderBar, AdwToolbarView } from "@gtk-js/adwaita";
import { GtkLabel, GtkWindowTitle } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <AdwToolbarView
      style={{ height: 200 }}
      topBars={
        <AdwHeaderBar
          showBackButton={false}
          titleWidget={<GtkWindowTitle title="Toolbar View" />}
        />
      }
      content={<GtkLabel label="Main content area" style={{ padding: 24 }} />}
    />
  );
}
