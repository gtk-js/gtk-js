import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The button's box: the stack with the selected item, then the arrow. */
function checkButtonBox(button: WidgetSnapshot) {
  const [box] = button.children ?? [];
  const [stack, arrow] = box?.children ?? [];
  return { box: box!, stack: stack!, arrow: arrow! };
}

/** Border-box width: native sizes are content-box ones, web ones border-box. */
const outerWidth = (w: WidgetSnapshot) =>
  w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;

// The outer `dropdown` div is a plain container; the styled element is the
// inner button.toggle — same pattern as GtkMenuButton. The button's child is a
// box: the stack, then the arrow 6px after it (gtkdropdown.ui, `dropdown >
// button > box { border-spacing: 6px }`).
gtkTest("dropdown-default", { childSelector: "button.toggle" }, (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  gtkAssert.numbersClose(
    outerWidth(native),
    web.width,
    { tolerance: 2, reason: "web label widths are fractional (Firefox: up to ~1.6px narrower)" },
    "width",
  );
  for (const tree of [native, web]) {
    const { box, stack, arrow } = checkButtonBox(tree);
    expect(arrow.x! - (stack.x! + stack.width), "gap").toBeCloseTo(6, 0);
    expect(arrow.x! + arrow.width, "arrow end").toBeCloseTo(box.width, 0);
    expect(arrow.width, "arrow width").toBe(16);
  }
});
