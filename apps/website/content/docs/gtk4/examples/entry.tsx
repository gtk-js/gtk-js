"use client";

import { GtkEntry } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("Downloads");

  return (
    <>
      <GtkEntry text={text} placeholderText="Type here..." onChanged={setText} />
      <GtkEntry
        text={query}
        placeholderText="Search"
        primaryIconName="SystemSearch"
        secondaryIconName={query ? "EditClear" : undefined}
        progressFraction={query ? 0.4 : 0}
        onChanged={setQuery}
        onIconPress={(position) => position === "secondary" && setQuery("")}
      />
    </>
  );
}
