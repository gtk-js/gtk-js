import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: font_weight — child title label bleed.
//
// font_weight: per _lists.scss:462-463, `row.button .title { @extend .heading }`
// which resolves to `font-weight: 700` (_labels.scss:56). The `row.button` node
// itself (adw-button-row.c, parent=AdwPreferencesRow, css node="row" with class
// "button") has no font-weight rule. Native extraction captures the child
// .title label's bold weight on the parent row node.
gtkTest("button-row-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "font_weight")).toEqual([]);
});
