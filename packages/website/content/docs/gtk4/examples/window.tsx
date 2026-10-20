"use client";

import { GtkButton, GtkHeaderBar, GtkLabel, GtkWindow, GtkWindowTitle } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [open, setOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);

  if (!open) return <GtkButton label="Open Window" onClicked={() => setOpen(true)} />;

  return (
    <GtkWindow
      style={{ width: 350, height: 200 }}
      maximized={maximized}
      onMaximize={() => setMaximized((m) => !m)}
      onClose={() => setOpen(false)}
      titlebar={<GtkHeaderBar titleWidget={<GtkWindowTitle title="My App" subtitle="Welcome" />} />}
    >
      <GtkLabel label="Window content" />
    </GtkWindow>
  );
}
