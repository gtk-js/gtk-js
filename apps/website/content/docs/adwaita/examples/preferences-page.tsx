"use client";

import { AdwActionRow, AdwPreferencesGroup, AdwPreferencesPage } from "@gtk-js/adwaita";

export default function Example() {
  return (
    <AdwPreferencesPage style={{ height: 250 }}>
      <AdwPreferencesGroup title="Account">
        <AdwActionRow title="Username" subtitle="alice" />
        <AdwActionRow title="Email" subtitle="alice@example.com" />
      </AdwPreferencesGroup>
      <AdwPreferencesGroup title="Privacy">
        <AdwActionRow title="Location" subtitle="Off" />
      </AdwPreferencesGroup>
    </AdwPreferencesPage>
  );
}
