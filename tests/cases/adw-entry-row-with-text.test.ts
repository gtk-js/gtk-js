import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("adw-entry-row-with-text", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // The text fills the editable area's height, not only its line
  // (allocate_editable_area()).
  expect(findChild(web, "text").height).toBeCloseTo(findChild(native, "text").height, 0);
});
