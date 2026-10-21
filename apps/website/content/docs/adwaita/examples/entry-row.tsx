"use client";

import { AdwEntryRow, AdwPreferencesGroup } from "@gtk-js/adwaita";
import { useState } from "react";

export default function Example() {
  const [name, setName] = useState("");

  return (
    <AdwPreferencesGroup style={{ width: 360 }}>
      <AdwEntryRow title="Name" text={name} onChanged={setName} />
    </AdwPreferencesGroup>
  );
}
