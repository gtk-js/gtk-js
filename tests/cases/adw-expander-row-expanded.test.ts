import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The `index`th node (breadth-first) with this CSS name and class. */
function node(tree: WidgetSnapshot, name: string, cls: string, index = 0): WidgetSnapshot {
  const queue = [...(tree.children ?? [])];
  let found = 0;
  while (queue.length > 0) {
    const n = queue.shift() as WidgetSnapshot;
    if (n.css_name === name && (!cls || n.css_classes?.includes(cls)) && found++ === index)
      return n;
    queue.push(...(n.children ?? []));
  }
  throw new Error(`no ${name}.${cls} #${index}`);
}

// The expander row itself is :checked while expanded, which the expanded look
// keys off (adw_expander_row_set_expanded(), _lists.scss).
gtkTest("adw-expander-row-expanded", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // The header gets the row separator instead of rounded bottom corners...
  const header = (t: WidgetSnapshot) => node(t, "row", "header");
  gtkAssert.numbersEqual(
    header(native).border_widths.bottom,
    header(web).border_widths.bottom,
    "header border-bottom",
  );
  // ...which the nested list takes, without a separator under its last row.
  const nested = (t: WidgetSnapshot) => node(t, "list", "nested");
  gtkAssert.cornersEqual(
    nested(native).border_radius,
    nested(web).border_radius,
    "nested list radius",
  );
  const last = (t: WidgetSnapshot) => node(nested(t), "row", "", 1);
  gtkAssert.numbersEqual(
    last(native).border_widths.bottom,
    last(web).border_widths.bottom,
    "last nested row border-bottom",
  );
  // The arrow points up, in the accent color.
  const arrow = (t: WidgetSnapshot) => node(t, "image", "expander-row-arrow");
  gtkAssert.colorsEqual(arrow(native).color, arrow(web).color, "arrow color");
  gtkAssert.numbersEqual(arrow(native).opacity, arrow(web).opacity, "arrow opacity");
});
