"use client";

import { AdwPreferencesGroup, AdwPreferencesRow } from "@gtk-js/adwaita";
import { GtkLabel } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <AdwPreferencesGroup style={{ width: 360 }}>
      <AdwPreferencesRow title="Custom Row">
        <GtkLabel label="A row with a custom child" style={{ margin: 12 }} />
      </AdwPreferencesRow>
    </AdwPreferencesGroup>
  );
}
