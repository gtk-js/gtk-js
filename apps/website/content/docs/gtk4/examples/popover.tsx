"use client";

import { GtkButton, GtkLabel, GtkPopover } from "@gtk-js/gtk4";
import { useRef, useState } from "react";

export default function Example() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div style={{ position: "relative" }}>
      <GtkButton ref={btnRef} label="Show Popover" onClick={() => setOpen(!open)} />
      <GtkPopover
        visible={open}
        anchorRef={btnRef}
        pointingTo={btnRef}
        onClosed={() => setOpen(false)}
      >
        <GtkLabel label="Popover content" style={{ padding: 12 }} />
      </GtkPopover>
    </div>
  );
}
