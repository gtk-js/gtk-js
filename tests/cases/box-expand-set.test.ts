import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

// Rendered on the server: a widget whose own hexpand/vexpand is true expands
// without expand.ts, so with halign/valign start it leaves the extra space
// after itself and its siblings end up at the box's end. A box set not to
// expand still doesn't.
gtkTest("box-expand-set", (native, web) => {
  const [nRow, nColumn] = native.children!;
  const [wRow, wColumn] = web.children!;
  // Native sizes are content sizes, web ones border-box sizes.
  const outer = (w: WidgetSnapshot, isWeb: boolean, horizontal: boolean) =>
    isWeb
      ? horizontal
        ? w.width
        : w.height
      : horizontal
        ? w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right
        : w.height +
          w.padding.top +
          w.padding.bottom +
          w.border_widths.top +
          w.border_widths.bottom;
  const trailing = (box: WidgetSnapshot, isWeb: boolean, horizontal: boolean) => {
    const last = box.children!.at(-1)!;
    return horizontal
      ? box.width - last.x! - outer(last, isWeb, true)
      : box.height - last.y! - outer(last, isWeb, false);
  };
  gtkAssert.numbersEqual(
    trailing(nRow!, false, true),
    trailing(wRow!, true, true),
    "row's space after its last child",
  );
  gtkAssert.numbersEqual(
    trailing(nColumn!, false, false),
    trailing(wColumn!, true, false),
    "column's space after its last child",
  );
  const slack = (box: WidgetSnapshot) => box.width - box.children![0]!.width;
  gtkAssert.numbersEqual(
    slack(nRow!.children![2]!),
    slack(wRow!.children![2]!),
    "box set not to expand",
  );
});
