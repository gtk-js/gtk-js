"use client";

import { GtkBox, GtkButton, GtkSearchBar, GtkSearchEntry } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [searching, setSearching] = useState(true);

  return (
    <GtkBox orientation="vertical" spacing={8}>
      <GtkButton
        label={searching ? "Close Search" : "Search"}
        onClick={() => setSearching(!searching)}
      />
      <GtkSearchBar
        searchModeEnabled={searching}
        showCloseButton
        onSearchModeChanged={setSearching}
        child={<GtkSearchEntry placeholderText="Search..." />}
      />
    </GtkBox>
  );
}
