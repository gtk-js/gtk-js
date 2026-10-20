import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The border-box width: native widths are content widths, web ones border-box widths. */
const outerWidth = (w: WidgetSnapshot, isWeb: boolean) =>
  isWeb
    ? w.width
    : w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;

// The switcher's tabs expand (gtk_stack_switcher add_child()): they share the
// 500px box equally, each from its natural width (the theme's 100px
// min-width), rather than bunching up at the start.
gtkTest("stack-switcher-expand", (native, web) => {
  const tabs = (box: WidgetSnapshot) => box.children![0]!.children!;
  const [n, w] = [tabs(native), tabs(web)];
  expect(w.length).toBe(n.length);
  const share = { tolerance: 1, reason: "GTK splits the extra space into whole pixels" };
  for (const [i, tab] of n.entries()) {
    expect(compare(tab, w[i]!).failures, `tab ${i}`).toEqual([]);
    gtkAssert.numbersClose(
      outerWidth(tab, false),
      outerWidth(w[i]!, true),
      share,
      `tab ${i} width`,
    );
    gtkAssert.numbersClose(tab.x!, w[i]!.x!, share, `tab ${i} x`);
  }
});
