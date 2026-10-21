"use client";

import { AdwToggleGroup } from "@gtk-js/adwaita";
import { GtkBox } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [view, setView] = useState("list");

  return (
    <GtkBox spacing={12} style={{ flexWrap: "wrap", justifyContent: "center" }}>
      <AdwToggleGroup
        activeName={view}
        onToggleChanged={(_, name) => setView(name)}
        toggles={[
          { name: "list", label: "List" },
          { name: "grid", label: "Grid" },
          { name: "compact", label: "Compact" },
        ]}
      />
      <AdwToggleGroup
        toggles={[
          { name: "picture", iconName: "CameraPhoto", tooltip: "Picture Mode" },
          { name: "recording", iconName: "CameraVideo", tooltip: "Recording Mode" },
        ]}
      />
      <AdwToggleGroup
        toggles={[
          { name: "picture", iconName: "CameraPhoto", label: "Picture" },
          { name: "recording", iconName: "CameraVideo", label: "Recording" },
        ]}
      />
    </GtkBox>
  );
}
