"use client";

import { AdwBreakpointBin } from "@gtk-js/adwaita";
import { GtkLabel } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [label, setLabel] = useState("Resize to trigger");

  return (
    <AdwBreakpointBin
      style={{ width: "100%", height: 80, resize: "horizontal", overflow: "auto" }}
      breakpoints={[
        {
          condition: { condition: "max-width: 300px" },
          onApply: () => setLabel("Narrow!"),
          onUnapply: () => setLabel("Wide!"),
        },
      ]}
    >
      <GtkLabel label={label} />
    </AdwBreakpointBin>
  );
}
