import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// A text view scrolls its own text, so its scrolled window allocates it the
// whole viewport (gtk_scrolled_window_allocate_child): it fills the frame in
// both directions, not just its text's width and height.
gtkTest("text-view-scrolled", (native, web) => {
  // The native GSK walker leaks the text view's background into the scrolled
  // window's snapshot (as with other containers); skip it at the root.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
  // Native sizes are content boxes, web ones border boxes.
  const slack = (scrolled: WidgetSnapshot, isWeb: boolean) => {
    const textView = findChild(scrolled, "textview");
    const { padding: p, border_widths: b } = scrolled;
    const insetX = isWeb ? p.left + p.right + b.left + b.right : 0;
    const insetY = isWeb ? p.top + p.bottom + b.top + b.bottom : 0;
    return {
      width: scrolled.width - insetX - textView.width,
      height: scrolled.height - insetY - textView.height,
    };
  };
  const [nativeSlack, webSlack] = [slack(native, false), slack(web, true)];
  gtkAssert.numbersEqual(nativeSlack.width, webSlack.width, "scrolled window - text view width");
  gtkAssert.numbersEqual(nativeSlack.height, webSlack.height, "scrolled window - text view height");
});
