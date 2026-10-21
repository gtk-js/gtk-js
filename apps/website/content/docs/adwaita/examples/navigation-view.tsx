"use client";

import { AdwHeaderBar, AdwNavigationView, AdwToolbarView, useNavigation } from "@gtk-js/adwaita";
import { GtkBox, GtkButton, GtkLabel } from "@gtk-js/gtk4";

function HomePage() {
  const nav = useNavigation();
  return (
    <AdwToolbarView
      topBars={<AdwHeaderBar showStartTitleButtons={false} showEndTitleButtons={false} />}
      content={
        <GtkBox orientation="vertical" spacing={12} valign="center">
          <GtkLabel label="Home Page" className="title-2" />
          <GtkButton
            label="Go to Details"
            className="pill"
            halign="center"
            onClicked={() => nav.push("details")}
          />
        </GtkBox>
      }
    />
  );
}

export default function Example() {
  return (
    <AdwNavigationView
      className="frame"
      style={{ width: 360, height: 240 }}
      pages={[
        { tag: "home", title: "Home", children: <HomePage /> },
        {
          tag: "details",
          title: "Details",
          children: (
            <AdwToolbarView
              topBars={<AdwHeaderBar showStartTitleButtons={false} showEndTitleButtons={false} />}
              content={<GtkLabel label="Details Page" />}
            />
          ),
        },
      ]}
    />
  );
}
