"use client";

import { AdwActionRow, AdwPreferencesGroup } from "@gtk-js/adwaita";

export default function Example() {
  return (
    <AdwPreferencesGroup title="General" description="Basic settings" style={{ width: 360 }}>
      <AdwActionRow title="Language" subtitle="English" />
      <AdwActionRow title="Region" subtitle="United States" />
    </AdwPreferencesGroup>
  );
}
