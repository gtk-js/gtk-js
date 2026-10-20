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

function findClass(tree: WidgetSnapshot, cssName: string, cssClass: string): WidgetSnapshot {
  const queue = [...(tree.children ?? [])];
  for (let node = queue.shift(); node; node = queue.shift()) {
    if (node.css_name === cssName && node.css_classes?.includes(cssClass)) return node;
    queue.push(...(node.children ?? []));
  }
  throw new Error(`${cssName}.${cssClass} not found`);
}

// The title doesn't expand and the spin button does
// (adw_action_row_set_expand_suffixes()): the spin button is as wide as its
// range needs, and the title wraps into what's left at word boundaries.
gtkTest("adw-spin-row-long-title", (native, web) => {
  expect(compare(findChild(native, "row"), findChild(web, "row")).failures).toEqual([]);
  const nativeSpin = findChild(native, "spinbutton");
  const webSpin = findChild(web, "spinbutton");
  gtkAssert.numbersEqual(nativeSpin.width, webSpin.width, "spinbutton width");
  gtkAssert.numbersEqual(
    findChild(native, "text").width,
    content(findChild(web, "text")).width,
    "text width",
  );
  gtkAssert.numbersEqual(
    findClass(native, "box", "title").width,
    findClass(web, "box", "title").width,
    "title width",
  );
  // Where the suffix starts in the header, and the title's two lines.
  gtkAssert.numbersClose(
    findClass(native, "box", "suffixes").x!,
    findClass(web, "box", "suffixes").x!,
    { tolerance: 2, reason: "title text widths" },
    "suffixes x",
  );
  gtkAssert.numbersClose(
    findClass(native, "box", "title").height,
    findClass(web, "box", "title").height,
    { tolerance: 2, reason: "two lines of title text" },
    "title height",
  );
  gtkAssert.numbersClose(
    findChild(native, "row").height,
    content(findChild(web, "row")).height,
    { tolerance: 2, reason: "two lines of title text" },
    "row height",
  );
});
