"use client";

import { AdwAlertDialog } from "@gtk-js/adwaita";
import { GtkButton } from "@gtk-js/gtk4";
import { useState } from "react";

export default function Example() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <GtkButton label="Show Alert" onClick={() => setVisible(true)} />
      <AdwAlertDialog
        visible={visible}
        heading="Delete File?"
        body="This action cannot be undone."
        responses={[
          { id: "cancel", label: "_Cancel" },
          { id: "delete", label: "_Delete", appearance: "destructive" },
        ]}
        defaultResponse="cancel"
        closeResponse="cancel"
        onResponse={() => setVisible(false)}
      />
    </>
  );
}
