import { expect } from "vite-plus/test";
import { gtkTest } from "../harness";

// The narrow label is 0.75rem, and GTK's rem is gtk-font-name's size (11pt),
// so the text is 11px. Against the browser's 16px root it was 12px, and the
// switcher, as wide as the label, 9% wider (Chromium +12.7px, Firefox ~+7px).
// Firefox draws this bold text 6.25px narrower than GTK even at 11px, so the
// check is one-sided: not wider than native, and not much narrower.
gtkTest("adw-view-switcher-narrow-label", (native, web) => {
  expect(web.width, "switcher width").toBeLessThanOrEqual(native.width + 4);
  expect(web.width, "switcher width").toBeGreaterThanOrEqual(native.width - 8);
});
