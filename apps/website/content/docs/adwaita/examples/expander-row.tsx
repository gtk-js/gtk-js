"use client";

import { AdwActionRow, AdwExpanderRow, AdwPreferencesGroup } from "@gtk-js/adwaita";

export default function Example() {
  return (
    <AdwPreferencesGroup style={{ width: 360 }}>
      <AdwExpanderRow title="Advanced Settings" subtitle="Optional configuration">
        <AdwActionRow title="Option A" subtitle="Enabled" />
        <AdwActionRow title="Option B" subtitle="Disabled" />
      </AdwExpanderRow>
    </AdwPreferencesGroup>
  );
}
