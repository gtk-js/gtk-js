"use client";

import { AdwHeaderBar, AdwOverlaySplitView, AdwToolbarView } from "@gtk-js/adwaita";
import { GtkBox, GtkLabel, GtkSwitch, GtkToggleButton, GtkWindowTitle } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<"start" | "end">("start");

  const toggle = (
    <GtkToggleButton
      iconName={position === "start" ? "SidebarShow" : "SidebarShowRight"}
      tooltipText="Toggle Sidebar"
      active={showSidebar}
      onToggled={setShowSidebar}
    />
  );

  return (
    <AdwToolbarView
      topBarStyle="raised"
      style={{ width: "100%", height: 320 }}
      topBars={
        <AdwHeaderBar
          showStartTitleButtons={false}
          showEndTitleButtons={false}
          start={position === "start" ? toggle : undefined}
          end={position === "end" ? toggle : undefined}
          titleWidget={<GtkWindowTitle title="Overlay Split View" />}
        />
      }
      content={
        <AdwOverlaySplitView
          collapsed={collapsed}
          showSidebar={showSidebar}
          onShowSidebarChanged={setShowSidebar}
          sidebarPosition={position}
          sidebar={
            <GtkBox orientation="vertical" spacing={18} halign="center" valign="center">
              <GtkLabel label="Sidebar" className="title-2" />
              <GtkToggleButton
                label="Start"
                className="pill"
                active={position === "start"}
                onToggled={(active) => active && setPosition("start")}
              />
              <GtkToggleButton
                label="End"
                className="pill"
                active={position === "end"}
                onToggled={(active) => active && setPosition("end")}
              />
            </GtkBox>
          }
          content={
            <GtkBox orientation="vertical" spacing={18} halign="center" valign="center">
              <GtkLabel label="Content" className="title-2" />
              <GtkBox spacing={12}>
                <GtkLabel label="Collapsed" />
                <GtkSwitch valign="center" active={collapsed} onStateSet={setCollapsed} />
              </GtkBox>
            </GtkBox>
          }
        />
      }
    />
  );
}
