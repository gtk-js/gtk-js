"use client";

import { GtkLabel, GtkPaned } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [position, setPosition] = useState(150);

  return (
    <GtkPaned
      position={position}
      onPositionChanged={setPosition}
      wideHandle
      style={{ width: 400, maxWidth: "100%", height: 120 }}
      startChild={<GtkLabel label="Start" style={{ padding: 12 }} />}
      endChild={<GtkLabel label="End" style={{ padding: 12 }} />}
    />
  );
}
