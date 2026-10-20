import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The border box (x, width) of the first node that matches, in the bar's coordinates. */
function place(
  bar: WidgetSnapshot,
  match: (node: WidgetSnapshot) => boolean,
): { x: number; width: number } {
  const walk = (node: WidgetSnapshot, originX: number): { x: number; width: number } | null => {
    for (const child of node.children ?? []) {
      const x = originX + (child.x ?? 0);
      if (match(child)) return { x, width: child.width };
      const found = walk(child, x + child.border_widths.left + child.padding.left);
      if (found) return found;
    }
    return null;
  };
  const found = walk(bar, 0);
  if (!found) throw new Error("node not found");
  return found;
}

const box = (side: string) => (node: WidgetSnapshot) =>
  node.css_name === "box" && (node.css_classes ?? []).includes(side);

// The title shrinks between the start and end boxes, each 6px away: the boxes'
// own theme margins (_header-bar.scss), which GtkCenterLayout's spacing (0 in a
// header bar) adds to rather than replaces.
//
// Filtered as in headerbar-start-end: inset_shadows (not extracted natively),
// font_weight (the bold title bleeds into the native root's report) and
// border_radius (the native host window's clip).
gtkTest("headerbar-narrow-title", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        !f.property.startsWith("inset_shadows") &&
        f.property !== "font_weight" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
  gtkAssert.numbersEqual(native.width, web.width, "width");
  for (const [name, snapshot] of [
    ["native", native],
    ["web", web],
  ] as const) {
    const start = place(snapshot, box("start"));
    const title = place(snapshot, (node) => node.css_name === "windowtitle");
    const end = place(snapshot, box("end"));
    gtkAssert.numbersEqual(6, title.x - (start.x + start.width), `${name} start gap`);
    gtkAssert.numbersEqual(6, end.x - (title.x + title.width), `${name} end gap`);
  }
  gtkAssert.numbersClose(
    place(native, (node) => node.css_name === "windowtitle").width,
    place(web, (node) => node.css_name === "windowtitle").width,
    {
      tolerance: 4,
      reason: "the side buttons' label widths (Firefox lays them out ~3px wider); the bug was 12px",
    },
    "title width",
  );
});
