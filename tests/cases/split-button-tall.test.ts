import { gtkAssert } from "../assert";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** Border-box height: native sizes are content-box ones, web ones border-box. */
const outerHeight = (w: WidgetSnapshot, native: boolean) =>
  native ? w.height + w.padding.top + w.padding.bottom : w.height;

// A tall child: the split button's box layout makes both buttons as tall, and
// the menu button gives its button all of its height.
gtkTest("split-button-tall", (native, web) => {
  gtkAssert.numbersEqual(native.height, web.height, "height");
  for (const [tree, isNative] of [
    [native, true],
    [web, false],
  ] as const) {
    const menubutton = tree.children?.[2];
    gtkAssert.numbersEqual(tree.height, outerHeight(menubutton!, isNative), "menu button height");
    gtkAssert.numbersEqual(
      tree.height,
      outerHeight(findChild(menubutton!, "button"), isNative),
      "arrow button height",
    );
  }
});
