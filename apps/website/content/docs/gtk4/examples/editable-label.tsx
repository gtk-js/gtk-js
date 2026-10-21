"use client";

import { GtkEditableLabel } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [text, setText] = useState("Click to edit");

  return <GtkEditableLabel text={text} onChanged={setText} />;
}
