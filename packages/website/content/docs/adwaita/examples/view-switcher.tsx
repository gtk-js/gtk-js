"use client";

import { AdwViewSwitcher } from "@gtk-js/adwaita";
import { GtkBox } from "@gtk-js/gtk4";
import { useState } from "react";

const pages = [
  { name: "home", title: "Home", iconName: "GoHome" },
  { name: "inbox", title: "Inbox", iconName: "MailUnread", badgeNumber: 3, needsAttention: true },
  { name: "settings", title: "Settings", iconName: "PreferencesSystem" },
];

export default function Example() {
  const [active, setActive] = useState("home");

  return (
    <GtkBox orientation="vertical" spacing={18}>
      <AdwViewSwitcher
        policy="wide"
        activePageName={active}
        onPageChanged={setActive}
        pages={pages}
      />
      <AdwViewSwitcher
        policy="narrow"
        activePageName={active}
        onPageChanged={setActive}
        pages={pages}
      />
    </GtkBox>
  );
}
