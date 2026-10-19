import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

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

// GtkSpinButton is a GtkBoxLayout (gtk_spin_button_class_init()): the text is
// width-chars wide (3 for 0..100, under the theme's 28px minimum) and the
// buttons fill the height.
gtkTest("spin-button-default", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  gtkAssert.numbersEqual(native.height, content(web).height, "height");
  const nativeText = findChild(native, "text");
  const webText = content(findChild(web, "text"));
  gtkAssert.numbersEqual(nativeText.width, webText.width, "text width");
  gtkAssert.numbersEqual(nativeText.height, webText.height, "text height");
  for (const index of [0, 1]) {
    const button = findChild(web, "button", index);
    gtkAssert.numbersEqual(native.height, button.height, "button height");
    gtkAssert.numbersEqual(0, button.y!, "button y");
  }
});
