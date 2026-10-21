"use client";

import {
  AdwBreakpointBin,
  AdwHeaderBar,
  AdwNavigationSplitView,
  AdwStatusPage,
  AdwToolbarView,
  useNavigation,
} from "@gtk-js/adwaita";
import { GtkLabel, GtkListBox, GtkListBoxRow, GtkScrolledWindow } from "@gtk-js/gtk4";
import { useState } from "react";

const FOLDERS = ["Inbox", "Starred", "Sent", "Drafts", "Archive"];

function Sidebar({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  const nav = useNavigation();
  return (
    <AdwToolbarView
      topBars={<AdwHeaderBar />}
      content={
        <GtkScrolledWindow hscrollbarPolicy="never">
          <GtkListBox
            className="navigation-sidebar"
            selectedRows={[selected]}
            onRowActivated={(i) => {
              onSelect(i);
              // Shows the content: side by side it's already visible, collapsed
              // it slides in over the sidebar.
              nav.push("content");
            }}
          >
            {FOLDERS.map((folder) => (
              <GtkListBoxRow key={folder}>
                <GtkLabel label={folder} xalign={0} />
              </GtkListBoxRow>
            ))}
          </GtkListBox>
        </GtkScrolledWindow>
      }
    />
  );
}

export default function Example() {
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState(0);

  return (
    <AdwBreakpointBin
      className="frame"
      style={{ width: "100%", height: 320, resize: "horizontal", overflow: "hidden" }}
      breakpoints={[
        {
          condition: { condition: "max-width: 400px" },
          onApply: () => setCollapsed(true),
          onUnapply: () => setCollapsed(false),
        },
      ]}
    >
      <AdwNavigationSplitView
        collapsed={collapsed}
        sidebar={{
          tag: "sidebar",
          title: "Mail",
          children: <Sidebar selected={selected} onSelect={setSelected} />,
        }}
        content={{
          tag: "content",
          title: FOLDERS[selected],
          children: (
            <AdwToolbarView
              topBars={<AdwHeaderBar />}
              content={
                <AdwStatusPage
                  title={FOLDERS[selected]}
                  description="Resize the view to collapse it"
                />
              }
            />
          ),
        }}
      />
    </AdwBreakpointBin>
  );
}
