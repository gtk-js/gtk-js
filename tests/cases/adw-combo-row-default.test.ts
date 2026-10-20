import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

type Match = (node: WidgetSnapshot) => boolean;

/** The first node that matches, depth-first, and its border box's x in the tree's content box. */
function locate(
  tree: WidgetSnapshot,
  match: Match,
): { node: WidgetSnapshot; x: number } | undefined {
  for (const child of tree.children ?? []) {
    const x = child.x ?? 0;
    if (match(child)) return { node: child, x };
    const found = locate(child, match);
    if (found)
      return { node: found.node, x: x + child.border_widths.left + child.padding.left + found.x };
  }
  return undefined;
}

const header: Match = (n) => !!n.css_classes?.includes("header");
const value: Match = (n) => n.css_name === "label" && !n.css_classes?.includes("title");
const arrow: Match = (n) => !!n.css_classes?.includes("dropdown-arrow");

/** How far a node starts from the end of the row's header (which has no padding or border). */
function fromEnd(tree: WidgetSnapshot, match: Match): number {
  const box = locate(tree, header)?.node;
  return box ? box.width - (locate(box, match)?.x ?? Number.NaN) : Number.NaN;
}

// The selected item is in a list view of its own (listview.inline > row, with
// 2px of padding) before the arrow, as in adw-combo-row.ui. The native list is
// stretched wider than the web one, so both are measured from the header's end.
gtkTest("adw-combo-row-default", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  gtkAssert.numbersClose(
    fromEnd(native, value),
    fromEnd(web, value),
    { tolerance: 1, reason: "GTK rounds the label's width up to whole pixels" },
    "value label from the header's end",
  );
  gtkAssert.numbersEqual(
    fromEnd(native, arrow),
    fromEnd(web, arrow),
    "arrow from the header's end",
  );
});
