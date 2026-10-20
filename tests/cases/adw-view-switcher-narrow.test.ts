import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** The box of the given policy in a button's stack (native has both, web the visible one). */
function stackBox(button: WidgetSnapshot, policy: string): WidgetSnapshot {
  const box = findChild(button, "stack").children?.find((c) => c.css_classes?.includes(policy));
  if (!box) throw new Error(`no box.${policy} in the stack`);
  return box;
}

// Narrow: the icon above the label, buttons 100px wide (MIN_NAT_BUTTON_WIDTH_NARROW).
// A page without an icon shows image-missing.
gtkTest("adw-view-switcher-narrow", (native, web) => {
  // Native reads the host window's background, corner clip and font weight
  // through the transparent root (see adw-view-switcher-default).
  expect(
    compare(native, web).failures.filter(
      (f) =>
        f.property !== "background_color" &&
        f.property !== "font_weight" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  gtkAssert.numbersEqual(native.width, web.width, "switcher width");
  gtkAssert.numbersEqual(native.height, web.height, "switcher height");
  for (const i of [0, 1, 2]) {
    const n = findChild(native, "button", i);
    const w = findChild(web, "button", i);
    gtkAssert.numbersEqual(n.width, w.width, `button ${i} width`);
    gtkAssert.numbersEqual(n.height, w.height, `button ${i} height`);
    gtkAssert.numbersEqual(n.x!, w.x!, `button ${i} x`);

    const nb = stackBox(n, "narrow");
    const wb = stackBox(w, "narrow");
    gtkAssert.sidesEqual(nb.padding, wb.padding, `button ${i} box padding`);
    gtkAssert.numbersEqual(nb.y!, wb.y!, `button ${i} box y`);
    const ni = findChild(nb, "indicatorbin");
    const wi = findChild(wb, "indicatorbin");
    gtkAssert.numbersEqual(ni.width, wi.width, `button ${i} icon width`);
    gtkAssert.numbersEqual(ni.height, wi.height, `button ${i} icon height`);
    gtkAssert.numbersEqual(ni.y!, wi.y!, `button ${i} icon y`);
    // The icon is centered over the label.
    gtkAssert.numbersClose(
      nb.x! + ni.x!,
      wb.x! + wi.x!,
      {
        tolerance: 1.5,
        reason:
          "GTK rounds centered positions down, and the label is 12px instead of 11px (rem against the browser's root font size)",
      },
      `button ${i} icon x`,
    );
    const nl = findChild(nb, "label");
    const wl = findChild(wb, "label");
    gtkAssert.numbersEqual(nl.y!, wl.y!, `button ${i} label y`);
    gtkAssert.sidesEqual(nl.padding, wl.padding, `button ${i} label padding`);
  }
});
