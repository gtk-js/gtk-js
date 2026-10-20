import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

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

// Title and subtitle lines, prefixes, a suffix and the enable switch, laid out
// in the header row like adw-expander-row.ui.
gtkTest("adw-expander-row-widgets", (native, web) => {
  // titleLines / subtitleLines ellipsize after one line.
  for (const cls of ["title", "subtitle"]) {
    gtkAssert.numbersEqual(
      node(native, "label", cls).height,
      node(web, "label", cls).height,
      `${cls} height`,
    );
  }
  gtkAssert.numbersEqual(
    node(native, "row", "expander").height,
    node(web, "row", "expander").height,
    "row height",
  );
  // Prefixes are 12px apart (adw_expander_row_add_prefix()).
  const prefixes = (t: WidgetSnapshot) => node(t, "box", "prefixes");
  gtkAssert.numbersEqual(
    node(prefixes(native), "image", "", 1).x ?? 0,
    node(prefixes(web), "image", "", 1).x ?? 0,
    "second prefix x",
  );
  // The header's suffixes hold the row's own, the switch and the arrow.
  const suffixes = (t: WidgetSnapshot) => node(t, "box", "suffixes");
  const names = (t: WidgetSnapshot) => suffixes(t).children?.map((c) => c.css_name);
  expect(names(web)).toEqual(names(native));
  for (const [name, cls] of [
    ["box", "title"],
    ["box", "suffixes"],
    ["switch", ""],
    ["image", "expander-row-arrow"],
  ]) {
    gtkAssert.numbersEqual(
      node(native, name, cls).x ?? 0,
      node(web, name, cls).x ?? 0,
      `${name}.${cls} x`,
    );
  }
  // The enable switch is a GtkSwitch.
  const parts = (t: WidgetSnapshot) => node(t, "switch", "").children?.map((c) => c.css_name);
  expect(parts(web)).toEqual(parts(native));
});
