import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// With hhomogeneous off the stack is as wide as its visible page, and the
// hidden page counts for its height laid out at that width
// (gtk_stack_measure()), not at its narrowest: four lines of text, not one
// per word.
gtkTest("stack-hhomogeneous-false", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const text = { tolerance: 1, reason: "GTK rounds text sizes to whole pixels" };
  gtkAssert.numbersClose(native.width, web.width, text, "stack width");
  gtkAssert.numbersClose(native.height, web.height, text, "stack height");
});
