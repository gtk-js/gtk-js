import { expect } from "vite-plus/test";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The back button and its parent, depth first. */
function findBack(
  tree: WidgetSnapshot,
  parent?: WidgetSnapshot,
): { button: WidgetSnapshot; parent?: WidgetSnapshot } | undefined {
  if (tree.css_classes?.includes("back")) return { button: tree, parent };
  for (const child of tree.children ?? []) {
    const found = findBack(child, tree);
    if (found) return found;
  }
  return undefined;
}

// Native snapshot sizes are the content box, web ones the border box.
const contentSize = (node: WidgetSnapshot | undefined, web: boolean) =>
  node && {
    width:
      node.width -
      (web
        ? node.padding.left +
          node.padding.right +
          node.border_widths.left +
          node.border_widths.right
        : 0),
    height:
      node.height -
      (web
        ? node.padding.top +
          node.padding.bottom +
          node.border_widths.top +
          node.border_widths.bottom
        : 0),
    x: node.x,
    y: node.y,
  };

const styleClasses = (node: WidgetSnapshot) =>
  (node.css_classes ?? []).filter((c) => !c.startsWith("gtk-")).sort();

// AdwHeaderBar's back button is an AdwBackButton: a `widget` holding a
// button.image-button.back, without .flat (adw-back-button.c), placed and
// styled like the native one.
gtkTest("adw-navigation-view-back-button", (native, web) => {
  const n = findBack(native);
  const w = findBack(web);
  expect(w).toBeDefined();
  expect(n).toBeDefined();
  if (!n || !w) return;
  expect(styleClasses(w.button)).toEqual(styleClasses(n.button));
  expect(w.parent?.css_name).toBe(n.parent?.css_name);
  expect(compare(n.button, w.button).failures).toEqual([]);
  for (const node of ["button", "parent"] as const) {
    const web = contentSize(w[node], true);
    const native = contentSize(n[node], false);
    for (const key of ["width", "height", "x", "y"] as const) {
      expect(web?.[key], `${node} ${key}`).toBeCloseTo(native?.[key] ?? Number.NaN, 0);
    }
  }
});
