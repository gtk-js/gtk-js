import { expect } from "vite-plus/test";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

// The scrollbars are overlay indicators: the viewport keeps the whole width,
// and the vertical one lies over it along the right edge, full height.
gtkTest("scrolled-window-overflow", (native, web) => {
  const geometry = (tree: WidgetSnapshot) => {
    const viewport = findChild(tree, "viewport");
    const vscrollbar = findChild(tree, "scrollbar", 1);
    return {
      gutter: tree.width - viewport.width,
      end: viewport.width - ((vscrollbar.x ?? 0) + vscrollbar.width),
      top: vscrollbar.y,
      height: viewport.height - vscrollbar.height,
    };
  };
  expect(geometry(web)).toEqual(geometry(native));
});
