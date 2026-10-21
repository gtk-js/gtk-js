"use client";

import { GtkTextView } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [text, setText] = useState("Type here...\nMultiple lines supported.");

  return (
    <GtkTextView
      value={text}
      onChanged={setText}
      wrapMode="word"
      style={{ width: 300, minHeight: 100 }}
    />
  );
}
