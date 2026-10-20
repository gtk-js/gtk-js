import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

/** The button's box: the stack with the selected item, then the arrow. */
function checkButtonBox(button: WidgetSnapshot) {
  const [box] = button.children ?? [];
  const [stack, arrow] = box?.children ?? [];
  return { box: box!, stack: stack!, arrow: arrow! };
}

/** Border-box width: native sizes are content-box ones, web ones border-box. */
const outerWidth = (w: WidgetSnapshot) =>
  w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;

// The dropdown allocates its button its full size (gtk_drop_down_size_allocate()):
// the label stays at the start, the arrow goes to the end.
gtkTest("dropdown-fill", (native, web) => {
  gtkAssert.numbersEqual(native.width, web.width, "dropdown width");
  const [nativeButton, webButton] = [native.children![0]!, web.children![0]!];
  gtkAssert.numbersEqual(outerWidth(nativeButton), webButton.width, "button width");
  for (const tree of [nativeButton, webButton]) {
    const { box, stack, arrow } = checkButtonBox(tree);
    expect(stack.x!, "stack start").toBeCloseTo(0, 0);
    expect(arrow.x! + arrow.width, "arrow end").toBeCloseTo(box.width, 0);
  }
});
