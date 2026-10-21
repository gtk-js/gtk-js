"use client";

import { GtkButton, GtkHeaderBar, GtkWindowTitle } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkHeaderBar
      titleWidget={<GtkWindowTitle title="My Application" />}
      start={<GtkButton iconName="OpenMenu" hasFrame={false} />}
    />
  );
}
