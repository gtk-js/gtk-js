"use client";

import { GtkDropDown } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [selected, setSelected] = useState(0);

  return (
    <GtkDropDown
      items={["Banana", "Apple", "Orange", "Mango"]}
      selected={selected}
      onSelected={setSelected}
    />
  );
}
