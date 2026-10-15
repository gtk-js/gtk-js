import { expect } from "bun:test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Filtered: font_weight, inset_shadows.
//
// font_weight: per _header-bar.scss:200-207, font-weight:bold is set on the
// `.title` child selector (`headerbar, windowtitle { .title { font-weight:
// bold } }`), NOT on the `headerbar` root node. Native GSK extraction reports
// the computed inherited value (700) at the headerbar root; the web side
// correctly shows 400 on the root since the headerbar node has no font-weight
// rule.
//
// inset_shadows: per _header-bar.scss:5-7, headerbar has inset box-shadows.
// The compiled web CSS (adwaita.css:2787) includes them, but native GSK
// extraction doesn't capture GskInsetShadowNode for the headerbar — same
// known limitation as headerbar-default.test.ts.
gtkTest("adw-headerbar-with-title", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => f.property !== "font_weight" && !f.property.startsWith("inset_shadows")),
  ).toEqual([]);

  // AdwHeaderBar and GtkWindowHandle are bin layouts: the window handle fills
  // the bar's height, so the title is vertically centered in it. (The native
  // bar is as tall as its test window, so compare the slack, not heights.)
  const slack = (bar: WidgetSnapshot) => bar.height - findChild(bar, "windowhandle").height;
  expect(slack(web)).toBeCloseTo(slack(native), 0);
});
