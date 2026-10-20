import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("editable-label-display-default", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // The stack is homogeneous (gtk_stack_init()), so the hidden text page's natural
  // width, NAT_ENTRY_WIDTH = 150px (gtk_text_measure()), sizes the label too.
  expect(web.width).toBeCloseTo(native.width, 0);
  expect(Math.abs(web.height - native.height)).toBeLessThanOrEqual(1);
});
