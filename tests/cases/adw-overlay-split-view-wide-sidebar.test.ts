import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

// A sidebar child whose minimum width is more than max-sidebar-width gets its
// minimum width (get_sidebar_width()).
gtkTest("adw-overlay-split-view-wide-sidebar", (native, web) => {
  const pane = (view: WidgetSnapshot, cls: string) =>
    view.children!.find((c) => c.css_classes?.includes(cls))!;
  gtkAssert.numbersEqual(
    pane(native, "sidebar-pane").width,
    pane(web, "sidebar-pane").width,
    "sidebar width",
  );
  gtkAssert.numbersEqual(
    pane(native, "content-pane").x!,
    pane(web, "content-pane").x!,
    "content x",
  );
});
