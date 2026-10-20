"use client";

import {
  AdwAlertDialog,
  AdwDialog,
  AdwEntryRow,
  AdwHeaderBar,
  AdwPreferencesGroup,
  AdwToolbarView,
} from "@gtk-js/adwaita";
import { GtkButton } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <GtkButton label="Rename…" onClick={() => setVisible(true)} />
      {/* With unsaved changes, closing asks first: Escape and the close button emit onCloseAttempt. */}
      <AdwDialog
        title="Rename"
        visible={visible}
        contentWidth={360}
        canClose={name === ""}
        onClosed={() => setVisible(false)}
        onCloseAttempt={() => setConfirming(true)}
        onHidden={() => setName("")}
      >
        <AdwToolbarView
          topBars={<AdwHeaderBar />}
          content={
            <AdwPreferencesGroup style={{ margin: 12 }}>
              <AdwEntryRow title="New Name" text={name} onChanged={setName} />
            </AdwPreferencesGroup>
          }
        />
      </AdwDialog>
      <AdwAlertDialog
        visible={confirming}
        heading="Discard Changes?"
        body="The new name will be lost."
        responses={[
          { id: "cancel", label: "_Cancel" },
          { id: "discard", label: "_Discard", appearance: "destructive" },
        ]}
        defaultResponse="cancel"
        closeResponse="cancel"
        onResponse={(id) => {
          setConfirming(false);
          if (id === "discard") setVisible(false);
        }}
      />
    </>
  );
}
