"use client";

import { AdwPreferencesGroup, AdwSpinRow } from "@gtk-js/adwaita";
import { useState } from "react";

export default function Example() {
  const [value, setValue] = useState(5);

  return (
    <AdwPreferencesGroup style={{ width: 360 }}>
      <AdwSpinRow title="Quantity" value={value} min={0} max={100} onValueChanged={setValue} />
    </AdwPreferencesGroup>
  );
}
