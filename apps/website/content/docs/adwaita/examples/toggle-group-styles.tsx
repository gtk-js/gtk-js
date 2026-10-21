"use client";

import { AdwToggleGroup } from "@gtk-js/adwaita";
import { GtkBox } from "@gtk-js/gtk4";

const toggles = [
  { name: "list", label: "List" },
  { name: "grid", label: "Grid" },
  { name: "compact", label: "Compact" },
];

export default function Example() {
  return (
    <GtkBox orientation="vertical" spacing={12}>
      <AdwToggleGroup className="flat" toggles={toggles} />
      <AdwToggleGroup className="round" toggles={toggles} />
      <AdwToggleGroup className="flat round" toggles={toggles} />
    </GtkBox>
  );
}
