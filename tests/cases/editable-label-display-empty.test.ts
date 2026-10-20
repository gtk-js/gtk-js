import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("editable-label-display-empty", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // An empty label still gets the text page's 150px, so there's something to click.
  expect(web.width).toBeCloseTo(native.width, 0);
  expect(Math.abs(web.height - native.height)).toBeLessThanOrEqual(1);
});
