import { gtkAssert } from "../assert";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** Border-box height: native sizes are content-box ones, web ones border-box. */
const outerHeight = (w: WidgetSnapshot, native: boolean) =>
  native ? w.height + w.padding.top + w.padding.bottom : w.height;

// The menu opens in a popover, a surface of its own: the split button keeps its
// size, and both its buttons stay as tall as it is.
gtkTest("split-button-open", (native, web) => {
  gtkAssert.numbersClose(
    native.width,
    web.width,
    { tolerance: 1, reason: "web label widths are fractional" },
    "width",
  );
  gtkAssert.numbersEqual(native.height, web.height, "height");
  for (const [tree, isNative] of [
    [native, true],
    [web, false],
  ] as const) {
    const [main, , menubutton] = tree.children ?? [];
    gtkAssert.numbersEqual(tree.height, outerHeight(main!, isNative), "button height");
    gtkAssert.numbersEqual(
      tree.height,
      outerHeight(findChild(menubutton!, "button"), isNative),
      "arrow button height",
    );
  }
});
