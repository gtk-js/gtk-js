"use client";

import { AdwPreferencesGroup, AdwSwitchRow } from "@gtk-js/adwaita";
import { useState } from "react";

export default function Example() {
  const [active, setActive] = useState(true);

  return (
    <AdwPreferencesGroup style={{ width: 360 }}>
      <AdwSwitchRow
        title="Notifications"
        subtitle="Receive push notifications"
        active={active}
        onActiveChanged={setActive}
      />
    </AdwPreferencesGroup>
  );
}
