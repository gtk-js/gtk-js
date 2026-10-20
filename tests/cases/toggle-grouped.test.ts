import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// The native box's own snapshot picks up its first button's background, so
// only the buttons are compared.
gtkTest("toggle-grouped", (native, web) => {
  // One, Two and Two again were clicked: a grouped button deactivates the
  // others, and clicking the active one keeps it active
  // (gtk_toggle_button_set_active(), gtk_toggle_button_clicked()). Only Two
  // has the checked background.
  expect(web.children?.length).toBe(3);
  native.children?.forEach((button, i) => {
    gtkAssert.colorsEqual(
      button.background_color,
      web.children?.[i]?.background_color ?? null,
      `button ${i} background_color`,
    );
  });
});
