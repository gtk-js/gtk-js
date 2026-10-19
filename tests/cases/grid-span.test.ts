import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

// The buttons are the grid's children and fill their cells: "1" one
// homogeneous column, "3" both. "2" keeps its natural width at its cell's end
// (halign=end).
gtkTest("grid-span", (native, web) => {
  const bounds = (grid: WidgetSnapshot, isWeb: boolean) => {
    // Native widths are content widths, web ones border-box widths.
    const outer = (w: WidgetSnapshot) =>
      isWeb
        ? w.width
        : w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;
    expect(grid.children!.map((child) => child.css_name)).toEqual(["button", "button", "button"]);
    const [one, two, three] = grid.children!;
    return {
      oneWidth: outer(one!),
      twoX: two!.x!,
      twoWidth: outer(two!),
      threeY: three!.y!,
      threeWidth: outer(three!),
    };
  };
  const n = bounds(native, false);
  const w = bounds(web, true);
  gtkAssert.numbersEqual(n.oneWidth, w.oneWidth, "1's width");
  gtkAssert.numbersEqual(n.twoX, w.twoX, "2's x");
  gtkAssert.numbersEqual(n.twoWidth, w.twoWidth, "2's width");
  gtkAssert.numbersEqual(n.threeY, w.threeY, "3's y");
  gtkAssert.numbersEqual(n.threeWidth, w.threeWidth, "3's width");
});
