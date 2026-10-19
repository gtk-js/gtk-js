import { expect } from "vite-plus/test";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

function nodes(tree: WidgetSnapshot): WidgetSnapshot[] {
  return [tree, ...(tree.children ?? []).flatMap(nodes)];
}

// With a single item there is nothing to choose: model_changed() hides the
// arrow and makes the row not activatable (no hover or press highlight).
gtkTest("adw-combo-row-single-item", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  for (const tree of [native, web]) {
    const row = nodes(tree).find((n) => n.css_classes?.includes("combo"));
    expect(row?.css_classes).not.toContain("activatable");
    expect(nodes(tree).some((n) => n.css_classes?.includes("dropdown-arrow"))).toBe(false);
  }
});
