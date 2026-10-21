"use client";

import { AdwActionRow, AdwPreferencesGroup } from "@gtk-js/adwaita";
import { GtkButton, GtkCheckButton, GtkImage } from "@gtk-js/gtk4";
import { useRef, useState } from "react";

export default function Example() {
  const [sync, setSync] = useState(true);
  const [opened, setOpened] = useState(0);
  const syncCheck = useRef<HTMLDivElement>(null);

  return (
    <AdwPreferencesGroup title="Account" style={{ width: 360 }}>
      <AdwActionRow title="Username" subtitle="john_doe" className="property" subtitleSelectable />
      <AdwActionRow
        title="Email"
        subtitle="john@example.com"
        suffixWidget={
          <GtkButton iconName="EditCopy" className="flat" valign="center" tooltipText="Copy" />
        }
      />
      <AdwActionRow
        title="Sync Contacts"
        activatableWidget={syncCheck}
        prefixWidget={
          <GtkCheckButton ref={syncCheck} active={sync} onToggled={setSync} valign="center" />
        }
      />
      <AdwActionRow
        title="Sign-In History"
        subtitle={`Opened ${opened} times`}
        activatable
        onActivated={() => setOpened((n) => n + 1)}
        suffixWidget={<GtkImage iconName="GoNext" />}
      />
    </AdwPreferencesGroup>
  );
}
