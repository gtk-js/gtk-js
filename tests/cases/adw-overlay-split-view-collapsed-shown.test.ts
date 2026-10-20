import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Collapsed, the sidebar pane loses .sidebar-pane for .background (the window
// colours, no border) and overlays the content, which is dimmed, with a 56px
// shadow along the sidebar's edge (update_collapsed(), allocate_collapsed(),
// adw_shadow_helper_size_allocate()).
gtkTest("adw-overlay-split-view-collapsed-shown", (native, web) => {
  const sidebar = (view: WidgetSnapshot) =>
    view.children!.find((c) => c.css_classes?.includes("background"))!;
  expect(compare(sidebar(native), sidebar(web)).failures).toEqual([]);
  gtkAssert.numbersEqual(sidebar(native).x!, sidebar(web).x!, "sidebar x");
  gtkAssert.numbersEqual(sidebar(native).width, sidebar(web).width, "sidebar width");
  // The dimming isn't compared: the native snapshot comes before its first
  // allocation (adw_shadow_helper_size_allocate() allocates it while it's
  // still hidden, so it gets one on the next layout).
  expect(findChild(web, "dimming").css_classes).toContain("left");
  const shadow = [findChild(native, "shadow"), findChild(web, "shadow")] as const;
  expect(shadow[1].css_classes).toContain("left");
  gtkAssert.numbersEqual(shadow[0].x!, shadow[1].x!, "shadow x");
  gtkAssert.numbersEqual(shadow[0].width, shadow[1].width, "shadow width");
  gtkAssert.numbersEqual(shadow[0].opacity, shadow[1].opacity, "shadow opacity");
});
