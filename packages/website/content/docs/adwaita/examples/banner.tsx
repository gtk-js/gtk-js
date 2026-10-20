"use client";

import { AdwBanner, AdwPreferencesGroup, AdwSwitchRow } from "@gtk-js/adwaita";
import { GtkBox } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [revealed, setRevealed] = useState(true);

  // A banner goes across the top of the content, as in the libadwaita demo,
  // so the example takes the preview's whole width.
  return (
    <GtkBox orientation="vertical" spacing={24} style={{ flex: "1 1 100%" }}>
      <AdwBanner
        revealed={revealed}
        title="You are offline"
        buttonLabel="Retry"
        onButtonClicked={() => setRevealed(false)}
      />
      <AdwPreferencesGroup>
        <AdwSwitchRow title="Show Banner" active={revealed} onActiveChanged={setRevealed} />
      </AdwPreferencesGroup>
    </GtkBox>
  );
}
