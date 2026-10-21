"use client";

import { GtkBox, GtkCheckButton } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [checked, setChecked] = useState(false);
  const [mixed, setMixed] = useState(true);
  const [option, setOption] = useState("a");

  return (
    <GtkBox spacing={16}>
      <GtkCheckButton label="Accept terms" active={checked} onToggled={setChecked} />
      <GtkCheckButton label="Select all" inconsistent={mixed} onToggled={() => setMixed(false)} />
      <GtkCheckButton
        label="Option A"
        group="demo"
        active={option === "a"}
        onToggled={(active) => active && setOption("a")}
      />
      <GtkCheckButton
        label="Option B"
        group="demo"
        active={option === "b"}
        onToggled={(active) => active && setOption("b")}
      />
    </GtkBox>
  );
}
