import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: font_weight — inner-child bleed.
//
// font_weight: per _buttons.scss:24, `button { font-weight: bold }` applies to
// the inner `button` children, not the outer `splitbutton` node
// (adw-split-button.c:485, css_name="splitbutton"). Native extraction captures
// the child's bold weight on the parent.
gtkTest("split-button-flat", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "font_weight")).toEqual([]);
});
