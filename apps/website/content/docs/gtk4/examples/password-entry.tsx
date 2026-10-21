"use client";

import { GtkPasswordEntry } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [, setPassword] = useState("");

  return <GtkPasswordEntry placeholderText="Enter password" showPeekIcon onChanged={setPassword} />;
}
