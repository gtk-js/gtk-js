import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

// The deprecated AdwActionRow:icon-name shows image.icon before the title box.
gtkTest("adw-action-row-icon", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const icon = { native: findChild(native, "image"), web: findChild(web, "image") };
  expect(icon.web.css_classes).toContain("icon");
  expect(icon.web.width).toBeCloseTo(icon.native.width, 0);
  expect(icon.web.x).toBeCloseTo(icon.native.x ?? 0, 0);
  expect(icon.web.y).toBeCloseTo(icon.native.y ?? 0, 0);
  // The title box follows the icon's 6px margin and the header's spacing.
  expect(findChild(web, "box", 1).x).toBeCloseTo(findChild(native, "box", 1).x ?? 0, 0);
});
