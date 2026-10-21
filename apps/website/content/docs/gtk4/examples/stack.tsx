"use client";

import { GtkBox, GtkLabel, GtkStack, GtkStackPage, GtkStackSwitcher } from "@gtk-js/gtk4";
import { useState } from "react";

const pages = [
  { name: "page1", title: "First" },
  { name: "page2", title: "Second" },
  { name: "page3", title: "Third" },
];

export default function Example() {
  const [active, setActive] = useState("page1");

  return (
    <GtkBox orientation="vertical" spacing={8} style={{ minWidth: 250 }}>
      <GtkStackSwitcher pages={pages} activePageName={active} onPageChanged={setActive} />
      <GtkStack visibleChildName={active}>
        <GtkStackPage name="page1" title="First">
          <GtkLabel label="Content of first page" style={{ padding: 16 }} />
        </GtkStackPage>
        <GtkStackPage name="page2" title="Second">
          <GtkLabel label="Content of second page" style={{ padding: 16 }} />
        </GtkStackPage>
        <GtkStackPage name="page3" title="Third">
          <GtkLabel label="Content of third page" style={{ padding: 16 }} />
        </GtkStackPage>
      </GtkStack>
    </GtkBox>
  );
}
