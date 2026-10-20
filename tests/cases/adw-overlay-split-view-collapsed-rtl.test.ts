import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

// In RTL the start sidebar overlays the content from the right, with the
// shadow on its left (get_start_or_end() in allocate_collapsed()).
gtkTest("adw-overlay-split-view-collapsed-rtl", (native, web) => {
  const sidebar = (view: WidgetSnapshot) =>
    view.children!.find((c) => c.css_classes?.includes("background"))!;
  gtkAssert.numbersEqual(sidebar(native).x!, sidebar(web).x!, "sidebar x");
  expect(findChild(web, "shadow").css_classes).toContain("right");
  gtkAssert.numbersEqual(findChild(native, "shadow").x!, findChild(web, "shadow").x!, "shadow x");
});
