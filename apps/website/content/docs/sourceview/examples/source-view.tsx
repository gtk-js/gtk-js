"use client";

import { GtkBox, GtkDropDown, GtkScrolledWindow } from "@gtk-js/gtk4";
import { GtkSourceView, getDefaultStyleSchemeManager } from "@gtk-js/sourceview";
import { useState } from "react";

const CODE = `#include <stdio.h>

int
main (int argc, char *argv[])
{
\tfor (int i = 1; i < argc; i++)
\t\tprintf ("Hello, %s!\\n", argv[i]);

\treturn 0;
}`;

const manager = getDefaultStyleSchemeManager();
const schemes = manager.getSchemeIds();

export default function Example() {
  const [scheme, setScheme] = useState(schemes.indexOf("Adwaita"));

  return (
    <GtkBox orientation="vertical" spacing={12} style={{ width: 420 }}>
      <GtkDropDown
        items={schemes.map((id) => manager.getScheme(id)?.name ?? id)}
        selected={scheme}
        onSelected={setScheme}
        halign="start"
      />
      <GtkScrolledWindow hasFrame style={{ height: 220 }}>
        <GtkSourceView
          defaultValue={CODE}
          styleScheme={schemes[scheme]}
          monospace
          showLineNumbers
          highlightCurrentLine
          autoIndent
          tabWidth={4}
          showRightMargin
          rightMarginPosition={40}
        />
      </GtkScrolledWindow>
    </GtkBox>
  );
}
