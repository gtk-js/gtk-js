"use client";

import { AdwToggleGroup } from "@gtk-js/adwaita";

export default function Example() {
  return (
    <AdwToggleGroup
      homogeneous
      toggles={[
        { name: "all", label: "All" },
        { name: "unread", label: "Unread" },
        { name: "recent", label: "Recently Read" },
      ]}
    />
  );
}
