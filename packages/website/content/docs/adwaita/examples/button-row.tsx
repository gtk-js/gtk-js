"use client";

import { AdwActionRow, AdwButtonRow, AdwPreferencesGroup } from "@gtk-js/adwaita";
import { useState } from "react";

export default function Example() {
  const [calendars, setCalendars] = useState(["Personal", "Work"]);

  return (
    <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 24 }}>
      <AdwPreferencesGroup title="Calendars">
        {calendars.map((name) => (
          <AdwActionRow key={name} title={name} subtitle="Synced with Online Accounts" />
        ))}
        <AdwButtonRow
          title="Add Calendar"
          startIconName="ListAdd"
          onActivated={() => setCalendars((names) => [...names, `Calendar ${names.length + 1}`])}
        />
      </AdwPreferencesGroup>
      <AdwPreferencesGroup separateRows>
        <AdwButtonRow title="Export Events" endIconName="GoNext" />
        <AdwButtonRow
          title="Remove All Calendars"
          className="destructive-action"
          onActivated={() => setCalendars([])}
        />
      </AdwPreferencesGroup>
    </div>
  );
}
