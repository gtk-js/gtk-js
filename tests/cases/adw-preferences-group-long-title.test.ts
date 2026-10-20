import { expect } from "vite-plus/test";
import { findChild, gtkTest } from "../harness";

// The title ellipsizes (adw-preferences-group.ui): one line, no wider than the
// group, which keeps the clamp's width rather than the title's.
gtkTest("adw-preferences-group-long-title", (native, web) => {
  for (const clamp of [native, web]) {
    const group = findChild(clamp, "preferencesgroup");
    const title = findChild(group, "label");
    expect(group.width).toBeLessThanOrEqual(300);
    expect(title.width).toBeLessThanOrEqual(group.width);
  }
  const title = findChild(findChild(web, "preferencesgroup"), "label");
  const nativeTitle = findChild(findChild(native, "preferencesgroup"), "label");
  expect(title.height).toBeCloseTo(nativeTitle.height, 0);
});
