"use client";

import { GtkBox, GtkToggleButton } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [active, setActive] = useState(false);
  const [flatActive, setFlatActive] = useState(true);

  return (
    <GtkBox spacing={8}>
      <GtkToggleButton label="Toggle Me" active={active} onToggled={setActive} />
      <GtkToggleButton
        label="Flat Toggle"
        active={flatActive}
        hasFrame={false}
        onToggled={setFlatActive}
      />
    </GtkBox>
  );
}
