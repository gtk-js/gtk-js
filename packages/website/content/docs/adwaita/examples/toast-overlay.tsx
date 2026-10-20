"use client";

import { type AdwToast, AdwToastOverlay, type AdwToastOverlayRef } from "@gtk-js/adwaita";
import { GtkBox, GtkButton } from "@gtk-js/gtk4";
import { useRef } from "react";

export default function Example() {
  const toastRef = useRef<AdwToastOverlayRef>(null);
  const undoToast = useRef<AdwToast | null>(null);

  // Adding the same toast again while it's shown restarts its timeout.
  const showUndoToast = () => {
    undoToast.current ??= {
      title: "‘Lorem Ipsum’ deleted",
      buttonLabel: "_Undo",
      priority: "high",
      onDismissed: () => {
        undoToast.current = null;
      },
    };
    toastRef.current?.addToast(undoToast.current);
  };

  return (
    <AdwToastOverlay toastRef={toastRef} style={{ flex: "1 1 100%", minHeight: 200 }}>
      <GtkBox spacing={12} halign="center" valign="start">
        <GtkButton
          label="Show Toast"
          onClicked={() => toastRef.current?.addToast({ title: "Simple Toast" })}
        />
        <GtkButton label="Toast with Button" onClicked={showUndoToast} />
      </GtkBox>
    </AdwToastOverlay>
  );
}
