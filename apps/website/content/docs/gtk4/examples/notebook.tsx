"use client";

import { GtkLabel, GtkNotebook, GtkNotebookPage } from "@gtk-js/gtk4";

export default function Example() {
  return (
    <GtkNotebook style={{ width: 300 }}>
      <GtkNotebookPage tabLabel="Page 1">
        <GtkLabel label="Content of page 1" style={{ padding: 24 }} />
      </GtkNotebookPage>
      <GtkNotebookPage tabLabel="Page 2">
        <GtkLabel label="Content of page 2" style={{ padding: 24 }} />
      </GtkNotebookPage>
    </GtkNotebook>
  );
}
