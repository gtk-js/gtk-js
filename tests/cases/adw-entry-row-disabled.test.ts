import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** The first node with a CSS class, breadth-first. */
function withClass(tree: WidgetSnapshot, cssClass: string): WidgetSnapshot {
  const queue = [...(tree.children ?? [])];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.css_classes?.includes(cssClass)) return node;
    queue.push(...(node.children ?? []));
  }
  throw new Error(`No node with class "${cssClass}"`);
}

// Filtered: opacity — the root takes the first opacity it finds below it
// (here the edit icon's), see adw-entry-row-default. The text and the edit
// icon are dimmed as row.entry:disabled in _lists.scss does.
gtkTest("adw-entry-row-disabled", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "opacity")).toEqual([]);
  expect(findChild(web, "text").opacity).toBeCloseTo(findChild(native, "text").opacity, 2);
  // `.edit-icon:disabled { opacity: $strong_disabled_opacity }` (30%) in
  // libadwaita 1.8's _lists.scss; CI's older native libadwaita reports 0.8, so
  // this checks the theme's value rather than the native snapshot.
  expect(withClass(web, "edit-icon").opacity).toBeCloseTo(0.3, 2);
});
