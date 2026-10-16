import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: font_weight — child label bleed.
//
// font_weight: per _buttons.scss:618-623, `buttoncontent > box > label` gets
// font-weight: bold. The `buttoncontent` node itself (adw-button-content.c:277,
// css_name="buttoncontent") has no font-weight rule. Native extraction captures
// the child label's bold weight on the parent node.
gtkTest("button-content-icon-label", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "font_weight")).toEqual([]);
});
