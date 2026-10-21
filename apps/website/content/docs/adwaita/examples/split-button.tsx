"use client";

import { AdwSplitButton } from "@gtk-js/adwaita";

export default function Example() {
  return (
    <AdwSplitButton label="Save" menuModel={[[{ label: "Save As…" }, { label: "Save All" }]]} />
  );
}
