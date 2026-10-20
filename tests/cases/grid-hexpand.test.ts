import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

// The buttons are the grid's children. Only the column of the button whose
// label expands takes the grid's extra width; "a" and "c" keep their natural
// (minimum) width, so "c" ends at the grid's end.
gtkTest("grid-hexpand", (native, web) => {
  const bounds = (grid: WidgetSnapshot, isWeb: boolean) => {
    // Native widths are content widths, web ones border-box widths.
    const outer = (w: WidgetSnapshot) =>
      isWeb
        ? w.width
        : w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;
    expect(grid.children!.map((child) => child.css_name)).toEqual(["button", "button", "button"]);
    const [a, b, c] = grid.children!;
    return {
      aWidth: outer(a!),
      bX: b!.x!,
      bWidth: outer(b!),
      cWidth: outer(c!),
      cEnd: c!.x! + outer(c!),
    };
  };
  const n = bounds(native, false);
  const w = bounds(web, true);
  gtkAssert.numbersEqual(n.aWidth, w.aWidth, "a's width");
  gtkAssert.numbersEqual(n.bX, w.bX, "b's x");
  gtkAssert.numbersEqual(n.bWidth, w.bWidth, "b's width");
  gtkAssert.numbersEqual(n.cWidth, w.cWidth, "c's width");
  gtkAssert.numbersEqual(n.cEnd, w.cEnd, "c's end");
});
