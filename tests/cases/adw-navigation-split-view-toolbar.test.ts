import { expect } from "vite-plus/test";
import { gtkTest, type WidgetSnapshot } from "../harness";

/** The first node (depth first) with a CSS class or name. */
function find(tree: WidgetSnapshot, name: string): WidgetSnapshot {
  const stack = [tree];
  while (stack.length > 0) {
    const node = stack.shift()!;
    if (node.css_name === name || node.css_classes?.includes(name)) return node;
    stack.push(...(node.children ?? []));
  }
  throw new Error(`No ${name} node`);
}

function count(tree: WidgetSnapshot, name: string): number {
  const own = tree.css_name === name ? 1 : 0;
  return own + (tree.children ?? []).reduce((n, child) => n + count(child, name), 0);
}

// Uncollapsed at 1002 px: the sidebar gets (int)(1002 × 0.25) = 250 px
// (allocate_uncollapsed()), both panes the whole height, so the content's
// bottom bar is at the bottom, and each pane's header bar hides the title
// buttons facing the other pane (update_start_title_buttons()).
gtkTest("adw-navigation-split-view-toolbar", (native, web) => {
  expect(web.width).toBeCloseTo(native.width, 0);
  expect(web.height).toBeCloseTo(native.height, 0);
  const panes = (tree: WidgetSnapshot) => [find(tree, "sidebar-pane"), find(tree, "content-pane")];
  const [nativeSidebar, nativeContent] = panes(native);
  const [webSidebar, webContent] = panes(web);
  expect(nativeSidebar.width).toBe(250);
  expect(webSidebar.width).toBeCloseTo(nativeSidebar.width, 0);
  expect(webContent.width).toBeCloseTo(nativeContent.width, 0);
  expect(webContent.x! - webSidebar.x!).toBeCloseTo(nativeContent.x! - nativeSidebar.x!, 0);
  for (const [n, w] of [
    [nativeSidebar, webSidebar],
    [nativeContent, webContent],
  ] as const) {
    expect(w.height).toBeCloseTo(n.height, 0);
    expect(find(w, "toolbarview").height).toBeCloseTo(find(n, "toolbarview").height, 0);
    expect(count(w, "windowcontrols")).toBe(count(n, "windowcontrols"));
  }
  expect(count(nativeSidebar, "windowcontrols")).toBe(1);
  expect(count(nativeContent, "windowcontrols")).toBe(1);
});
