"use client";

import { GtkSpinButton } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [value, setValue] = useState(5);

  return <GtkSpinButton value={value} min={0} max={20} step={1} onValueChanged={setValue} />;
}
