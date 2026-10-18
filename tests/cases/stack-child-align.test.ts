import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The border-box width: native widths are content widths, web ones border-box widths. */
const outerWidth = (w: WidgetSnapshot, isWeb: boolean) =>
  isWeb
    ? w.width
    : w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;

// A stack gives its page all of its size (gtk_stack_size_allocate()), and the
// page's widget aligns itself in it: the button keeps its natural size,
// centered in the 300×80 stack.
gtkTest("stack-child-align", (native, web) => {
  gtkAssert.numbersEqual(native.width, web.width, "stack width");
  gtkAssert.numbersEqual(native.height, web.height, "stack height");
  const [n, w] = [native.children![0]!, web.children![0]!];
  expect(compare(n, w).failures).toEqual([]);
  gtkAssert.numbersEqual(outerWidth(n, false), outerWidth(w, true), "button width");
  gtkAssert.numbersEqual(n.x!, w.x!, "button x");
  gtkAssert.numbersEqual(n.y!, w.y!, "button y");
});
