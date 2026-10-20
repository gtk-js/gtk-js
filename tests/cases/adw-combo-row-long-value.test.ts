import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

function find(tree: WidgetSnapshot, match: (node: WidgetSnapshot) => boolean): WidgetSnapshot {
  for (const child of tree.children ?? []) {
    if (match(child)) return child;
    try {
      return find(child, match);
    } catch {}
  }
  throw new Error(`no match under ${tree.css_name}`);
}

// The default factory's label ellipsizes the selected item at 20 characters
// (max-width-chars), so the row keeps its height and the title its width.
gtkTest("adw-combo-row-long-value", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const row = (t: WidgetSnapshot) => find(t, (n) => n.css_name === "row");
  const title = (t: WidgetSnapshot) =>
    find(t, (n) => n.css_name === "label" && !!n.css_classes?.includes("title"));
  const value = (t: WidgetSnapshot) =>
    find(t, (n) => n.css_name === "label" && !n.css_classes?.includes("title"));
  // Native heights are content heights, web ones border-box heights.
  const webRow = row(web);
  gtkAssert.numbersEqual(
    row(native).height,
    webRow.height - webRow.padding.top - webRow.padding.bottom,
    "row height",
  );
  gtkAssert.numbersClose(
    title(native).width,
    title(web).width,
    { tolerance: 1, reason: "glyph widths" },
    "title width",
  );
  gtkAssert.numbersClose(
    value(native).width,
    value(web).width,
    { tolerance: 1, reason: "glyph widths" },
    "value width",
  );
});
