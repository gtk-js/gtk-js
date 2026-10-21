"use client";

import { AdwPasswordEntryRow, AdwPreferencesGroup } from "@gtk-js/adwaita";
import { useState } from "react";

export default function Example() {
  const [password, setPassword] = useState("");

  return (
    <AdwPreferencesGroup style={{ width: 360 }}>
      <AdwPasswordEntryRow title="Password" text={password} onChanged={setPassword} />
    </AdwPreferencesGroup>
  );
}
