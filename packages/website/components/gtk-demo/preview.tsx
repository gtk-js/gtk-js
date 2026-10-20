"use client";

import { GtkBox, GtkButton, GtkProvider } from "@gtk-js/gtk4";
import type { ReactNode } from "react";
import { useState } from "react";
import { SyntaxHighlight } from "./syntax-highlight";
import { ThemeControls } from "./theme-controls";
import { useThemePicker } from "./use-theme-picker";

interface PreviewProps {
  source: string;
  children: ReactNode;
}

export function Preview({ source, children }: PreviewProps) {
  const state = useThemePicker();
  const [tab, setTab] = useState<"preview" | "code">("preview");

  return (
    // not-prose: the docs body's typography styles (link underline offset and
    // hover fade, margins on p/ul/li, code backticks) must not reach the widgets.
    <div className="not-prose my-4 rounded-lg overflow-hidden border border-fd-border">
      <GtkProvider theme={state.theme} icons={state.icons}>
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px 8px",
            borderBottom: "1px solid rgba(128,128,128,0.2)",
          }}
        >
          <GtkBox spacing={2}>
            <GtkButton
              label="Preview"
              className={tab === "preview" ? "suggested-action" : "flat"}
              onClicked={() => setTab("preview")}
            />
            <GtkButton
              label="Code"
              className={tab === "code" ? "suggested-action" : "flat"}
              onClicked={() => setTab("code")}
            />
          </GtkBox>
          <div style={{ flex: 1 }} />
          <ThemeControls {...state} />
        </div>

        {/* Content */}
        {tab === "preview" ? (
          // .background paints the window colors behind the example, as the
          // GtkWindow it would live in does (_common.scss).
          <div
            className="background"
            style={{
              padding: 24,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              minHeight: 100,
            }}
          >
            {children}
          </div>
        ) : (
          <div style={{ background: "#0d1117", padding: 20, overflowX: "auto" }}>
            <SyntaxHighlight code={source} />
          </div>
        )}
      </GtkProvider>
    </div>
  );
}
