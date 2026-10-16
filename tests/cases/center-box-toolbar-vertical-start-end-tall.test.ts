import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The box's children, with the web's empty slots left out. */
function children(box: WidgetSnapshot): WidgetSnapshot[] {
  return (box.children ?? []).filter((child) => child.width > 0 && child.height > 0);
}

/** gtk_widget_get_width()/get_height() are the content size; the web snapshot measures the border box. */
function content(box: WidgetSnapshot, isWeb: boolean): { width: number; height: number } {
  if (!isWeb) return { width: box.width, height: box.height };
  const { padding: p, border_widths: b } = box;
  return {
    width: box.width - p.left - p.right - b.left - b.right,
    height: box.height - p.top - p.bottom - b.top - b.bottom,
  };
}

// Vertically, GtkCenterLayout puts the start child at the top and the end
// child at the bottom, and gives both the box's full width: the narrower
// label fills it too.
gtkTest("center-box-toolbar-vertical-start-end-tall", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const placement = (box: WidgetSnapshot, isWeb: boolean) => {
    const size = content(box, isWeb);
    const [start, end] = children(box);
    // The web's slots hold the labels.
    const label = (slot: WidgetSnapshot) => (isWeb ? slot.children![0]! : slot);
    return {
      startTop: start!.y ?? Number.NaN,
      endBottom: size.height - ((end!.y ?? Number.NaN) + end!.height),
      startFill: size.width - label(start!).width,
      endFill: size.width - label(end!).width,
    };
  };
  const n = placement(native, false);
  const w = placement(web, true);
  gtkAssert.numbersEqual(n.startTop, w.startTop, "start child at the top");
  gtkAssert.numbersEqual(n.endBottom, w.endBottom, "end child at the bottom");
  gtkAssert.numbersEqual(n.startFill, w.startFill, "start child fills the width");
  gtkAssert.numbersEqual(n.endFill, w.endFill, "end child fills the width");
});
