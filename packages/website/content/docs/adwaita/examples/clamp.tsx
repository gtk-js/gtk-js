"use client";

import { AdwActionRow, AdwClamp, AdwPreferencesGroup } from "@gtk-js/adwaita";

export default function Example() {
  return (
    <AdwClamp maximumSize={400} tighteningThreshold={300} style={{ width: "100%" }}>
      <AdwPreferencesGroup title="Account">
        <AdwActionRow title="Username" subtitle="john_doe" />
        <AdwActionRow title="Email" subtitle="john@example.com" />
      </AdwPreferencesGroup>
    </AdwClamp>
  );
}
