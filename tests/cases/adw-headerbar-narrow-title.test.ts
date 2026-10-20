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

const isTitle = (node: WidgetSnapshot) => node.css_name === "windowtitle";

// The title shrinks against the end box, 6px away: the box's own theme margin
// (_header-bar.scss), which GtkCenterLayout's spacing (0 in a header bar) adds
// to rather than replaces. The empty start box is hidden, margin and all
// (update_box_visibility()), so the title reaches the bar's padding.
//
// Filtered as in adw-headerbar-start-end: border_radius (the native host's
// clip), font_weight (the bold title bleeds into the native root's report) and
// inset_shadows (not extracted natively).
gtkTest("adw-headerbar-narrow-title", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "font_weight" &&
        !f.property.startsWith("border_radius") &&
        !f.property.startsWith("inset_shadows"),
    ),
  ).toEqual([]);
  gtkAssert.numbersEqual(native.width, web.width, "width");
  for (const [name, snapshot] of [
    ["native", native],
    ["web", web],
  ] as const) {
    const title = place(snapshot, isTitle);
    const end = place(
      snapshot,
      (node) => node.css_name === "box" && (node.css_classes ?? []).includes("end"),
    );
    gtkAssert.numbersEqual(6, end.x - (title.x + title.width), `${name} end gap`);
  }
  // The title starts at the bar's padding, with no empty start box before it.
  gtkAssert.numbersEqual(place(native, isTitle).x, place(web, isTitle).x, "title x");
  gtkAssert.numbersClose(
    place(native, isTitle).width,
    place(web, isTitle).width,
    { tolerance: 1, reason: "the button's glyph widths" },
    "title width",
  );
});
