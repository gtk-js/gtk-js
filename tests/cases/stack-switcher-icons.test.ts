import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The border-box width: native widths are content widths, web ones border-box widths. */
const outerWidth = (w: WidgetSnapshot, isWeb: boolean) =>
  isWeb
    ? w.width
    : w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;

// gtk_stack_switcher rebuild_child(): an icon page's tab holds only its image
// (an image button), a titled page's tab its centered label, which anchors
// the needs-attention dot, and a page with neither has no tab.
gtkTest("stack-switcher-icons", (native, web) => {
  const [n, w] = [native.children!, web.children!];
  expect(w.length).toBe(n.length);
  for (const [i, tab] of n.entries()) {
    expect(compare(tab, w[i]!).failures, `tab ${i}`).toEqual([]);
    for (const cls of ["image-button", "text-button", "needs-attention"]) {
      expect(w[i]!.css_classes?.includes(cls), `tab ${i} .${cls}`).toBe(
        tab.css_classes?.includes(cls),
      );
    }
    gtkAssert.numbersEqual(outerWidth(tab, false), outerWidth(w[i]!, true), `tab ${i} width`);
    const [nChild, wChild] = [tab.children![0]!, w[i]!.children![0]!];
    expect(wChild.css_name, `tab ${i} child`).toBe(nChild.css_name);
    const text = {
      tolerance: 1.5,
      reason: "Pango and the browser measure the text up to a pixel apart",
    };
    gtkAssert.numbersClose(
      outerWidth(nChild, false),
      outerWidth(wChild, true),
      text,
      `tab ${i} child width`,
    );
    gtkAssert.numbersClose(nChild.x!, wChild.x!, text, `tab ${i} child x`);
  }
});
