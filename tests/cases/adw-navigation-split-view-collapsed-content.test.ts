import { expect } from "vite-plus/test";
import { findChild, gtkTest } from "../harness";

// navigation.push of the content while uncollapsed sets show-content
// (navigation_push_cb()), which collapsing keeps: the content page is shown,
// with its bottom bar, and a back button to the sidebar.
gtkTest("adw-navigation-split-view-collapsed-content", (native, web) => {
  expect(web.width).toBeCloseTo(native.width, 0);
  expect(web.height).toBeCloseTo(native.height, 0);
  const nativeBar = findChild(native, "actionbar");
  const webBar = findChild(web, "actionbar");
  expect(webBar.height).toBeCloseTo(nativeBar.height, 0);
  expect(webBar.width).toBeCloseTo(nativeBar.width, 0);
  // A visible back button: a node with the `back` class.
  const back = (tree: typeof native) => JSON.stringify(tree).includes('"back"');
  expect(back(native)).toBe(true);
  expect(back(web)).toBe(true);
});
