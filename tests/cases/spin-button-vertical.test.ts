import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** A web node's content size: native snapshots measure the content box. */
function content(node: WidgetSnapshot) {
  return {
    width:
      node.width -
      node.padding.left -
      node.padding.right -
      node.border_widths.left -
      node.border_widths.right,
    height:
      node.height -
      node.padding.top -
      node.padding.bottom -
      node.border_widths.top -
      node.border_widths.bottom,
  };
}

const order = (node: WidgetSnapshot) =>
  (node.children ?? []).map((c) =>
    [c.css_name, ...(c.css_classes ?? []).filter((n) => n === "up" || n === "down")].join("."),
  );

// A vertical spin button is a vertical box with the up button first
// (gtk_spin_button_set_orientation()), and its text fills the width.
gtkTest("spin-button-vertical", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  expect(order(web)).toEqual(order(native));
  const [, nativeText] = native.children!;
  const [, webText] = web.children!;
  gtkAssert.numbersEqual(nativeText!.height, content(webText!).height, "text height");
  gtkAssert.numbersEqual(nativeText!.x!, webText!.x!, "text x");
  gtkAssert.numbersEqual(webText!.width, content(web).width, "text fills the width");
});
