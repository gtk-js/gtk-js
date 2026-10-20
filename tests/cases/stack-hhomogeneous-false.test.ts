import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// With hhomogeneous off the stack is as wide as its visible page, and the
// hidden page counts for its height laid out at that width
// (gtk_stack_measure()), not at its narrowest: its wrapping label fits on one
// line rather than taking one per word. (The label is shorter than the
// visible page, so the height doesn't depend on whether GTK measures it for
// the stack's width or for none, which differs between GTK versions.)
gtkTest("stack-hhomogeneous-false", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const text = { tolerance: 1, reason: "GTK rounds text sizes to whole pixels" };
  gtkAssert.numbersClose(native.width, web.width, text, "stack width");
  gtkAssert.numbersClose(native.height, web.height, text, "stack height");
});
