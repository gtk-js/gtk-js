"use client";

import { AdwComboRow, AdwPreferencesGroup } from "@gtk-js/adwaita";
import { useState } from "react";

export default function Example() {
  const [selected, setSelected] = useState(0);

  return (
    <AdwPreferencesGroup style={{ width: 360 }}>
      <AdwComboRow
        title="Color"
        items={["Red", "Green", "Blue", "Yellow"]}
        selected={selected}
        onSelected={setSelected}
      />
    </AdwPreferencesGroup>
  );
}
