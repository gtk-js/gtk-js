import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

// sidebar-position=end adds .end to the sidebar pane, which puts its border on
// the side next to the content (adw_overlay_split_view_set_sidebar_position(),
// _sidebars.scss).
gtkTest("adw-overlay-split-view-end", (native, web) => {
  const sidebar = (view: WidgetSnapshot) =>
    view.children!.find((c) => c.css_classes?.includes("sidebar-pane"))!;
  expect(sidebar(web).css_classes).toContain("end");
  gtkAssert.colorsEqual(sidebar(native).background_color, sidebar(web).background_color);
  // The border is on the sidebar's left, next to the content. (Native's
  // snapshot doesn't reach the inset shadow of the translated pane; the
  // screenshots show it there.)
  expect(sidebar(web).inset_shadows.map((s) => s.dx)).toEqual([1]);
  gtkAssert.numbersEqual(sidebar(native).x!, sidebar(web).x!, "sidebar x");
});
