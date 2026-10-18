import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** The box of the given policy in a button's stack (native has both, web the visible one). */
function stackBox(button: WidgetSnapshot, policy: string): WidgetSnapshot {
  const box = findChild(button, "stack").children?.find((c) => c.css_classes?.includes(policy));
  if (!box) throw new Error(`no box.${policy} in the stack`);
  return box;
}

/** gtk_widget_get_width() / get_height() are the content box; the web snapshot measures the border box. */
function contentSize(w: WidgetSnapshot) {
  return {
    width:
      w.width - w.padding.left - w.padding.right - w.border_widths.left - w.border_widths.right,
    height:
      w.height - w.padding.top - w.padding.bottom - w.border_widths.top - w.border_widths.bottom,
  };
}

// Filtered: border_radius, background_color, font_weight.
//
// border_radius: per _window.scss:7, CSD host `border-radius:
// var(--window-radius)` clips into the viewswitcher via GskRoundedClipNode.
// The viewswitcher SCSS (_view-switcher.scss:1-33) has no border-radius.
//
// background_color: the `viewswitcher` SCSS (_view-switcher.scss:1-33) has
// no background-color rule. Native reports a faint rgba from the host window
// bleeding through the transparent root.
//
// font_weight: the `viewswitcher` SCSS has no font-weight on its root node.
// The only font-weight:bold is on `indicatorbin > indicator > label`
// (_view-switcher.scss:112). Native reports 700 from the host adw::Window
// inherited value; web correctly shows 400.
gtkTest("adw-view-switcher-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        f.property !== "font_weight" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);

  // A homogeneous BoxLayout of flat buttons 120px wide (MIN_NAT_BUTTON_WIDTH_WIDE),
  // as tall as the switcher's min-height, 3px apart (border-spacing).
  gtkAssert.numbersEqual(native.width, web.width, "switcher width");
  gtkAssert.numbersEqual(native.height, web.height, "switcher height");
  for (const i of [0, 1]) {
    const n = findChild(native, "button", i);
    const w = findChild(web, "button", i);
    expect(w.css_classes).toContain("flat");
    gtkAssert.numbersEqual(n.width, w.width, `button ${i} width`);
    gtkAssert.numbersEqual(n.height, w.height, `button ${i} height`);
    gtkAssert.numbersEqual(n.x!, w.x!, `button ${i} x`);
    gtkAssert.colorsEqual(n.background_color, w.background_color, `button ${i} background`);

    // The stack's box.wide is centered, with the theme's padding around the icon and label.
    const nb = stackBox(n, "wide");
    const wb = stackBox(w, "wide");
    gtkAssert.sidesEqual(nb.padding, wb.padding, `button ${i} box padding`);
    gtkAssert.numbersEqual(nb.height, contentSize(wb).height, `button ${i} box height`);
    gtkAssert.numbersEqual(nb.y!, wb.y!, `button ${i} box y`);
    gtkAssert.numbersClose(
      nb.x!,
      wb.x!,
      {
        tolerance: 1.5,
        reason: "the label's text is narrower than Pango's (up to ~1.1px in Firefox)",
      },
      `button ${i} box x`,
    );
    const ni = findChild(nb, "indicatorbin");
    const wi = findChild(wb, "indicatorbin");
    gtkAssert.numbersEqual(ni.width, wi.width, `button ${i} icon width`);
    gtkAssert.numbersEqual(ni.height, wi.height, `button ${i} icon height`);
    gtkAssert.numbersEqual(ni.y!, wi.y!, `button ${i} icon y`);
  }
});
