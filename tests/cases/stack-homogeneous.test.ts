import { expect } from "bun:test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// GtkStack is homogeneous by default: as wide as its widest page, even while
// a narrower one is shown. Below it, a label with that page's text.
gtkTest("stack-homogeneous", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const extra = (box: WidgetSnapshot) => box.children![0]!.width - box.children![1]!.width;
  gtkAssert.numbersEqual(extra(native), extra(web), "stack width beyond the long page's");
});
