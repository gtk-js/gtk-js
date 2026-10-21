"use client";

import { GtkScale } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [value, setValue] = useState(50);

  return (
    <GtkScale
      value={value}
      min={0}
      max={100}
      drawValue
      onValueChanged={setValue}
      style={{ width: 250 }}
    />
  );
}
