"use client";

import { GtkScrollbar } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [value, setValue] = useState(0.3);

  return (
    <GtkScrollbar
      orientation="vertical"
      value={value}
      pageSize={0.3}
      onValueChanged={setValue}
      style={{ height: 150 }}
    />
  );
}
