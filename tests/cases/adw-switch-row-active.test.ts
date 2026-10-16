import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: shadows — GtkSwitch slider box-shadow bleed.
//
// _switch.scss:22 defines `box-shadow: 0 2px 4px RGB(0 0 6 / 20%)` on
// `switch > slider`. The native extraction picks up this child shadow on
// the parent row via GskOutsetShadowNode traversal (same pattern as
// switch-off-default.test.ts). The web side correctly scopes the shadow
// to the slider child element.
gtkTest("adw-switch-row-active", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);
});
