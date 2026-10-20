"use client";

import { AdwViewSwitcherBar } from "@gtk-js/adwaita";

export default function Example() {
  return (
    <AdwViewSwitcherBar
      reveal
      style={{ width: 400 }}
      pages={[
        { name: "home", title: "Home", iconName: "GoHome" },
        { name: "search", title: "Search", iconName: "SystemSearch" },
        { name: "settings", title: "Settings", iconName: "PreferencesSystem" },
      ]}
    />
  );
}
