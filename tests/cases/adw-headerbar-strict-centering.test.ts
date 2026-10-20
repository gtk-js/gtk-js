import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The x and width of the bar's window title, in the bar's coordinates. */
function titlePlace(node: WidgetSnapshot, originX = 0): { x: number; width: number } | null {
  for (const child of node.children ?? []) {
    const x = originX + (child.x ?? 0);
    if (child.css_name === "windowtitle") return { x, width: child.width };
    const found = titlePlace(child, x + child.border_widths.left + child.padding.left);
    if (found) return found;
  }
  return null;
}

// centering-policy STRICT gives the narrow end side the wide start side's width
// (a size group), so the shrunk title stays centered in the bar instead of
// taking the end side's spare room.
//
// Filtered as in adw-headerbar-start-end: border_radius (the native host's
// clip), font_weight (the bold title bleeds into the native root's report) and
// inset_shadows (not extracted natively).
gtkTest("adw-headerbar-strict-centering", (native, web) => {
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
  for (const [name, bar] of [
    ["native", native],
    ["web", web],
  ] as const) {
    const title = titlePlace(bar);
    expect(title, `${name} title`).not.toBeNull();
    gtkAssert.numbersClose(
      bar.width / 2,
      title!.x + title!.width / 2,
      { tolerance: 1, reason: "whole-pixel allocation" },
      `${name} title center`,
    );
  }
});
