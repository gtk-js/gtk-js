"use client";

import { GtkSwitch } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [active, setActive] = useState(false);

  return <GtkSwitch active={active} onStateSet={(v) => setActive(v)} />;
}
