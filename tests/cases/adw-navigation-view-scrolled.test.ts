import { gtkAssert } from "../assert";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

// A page gets the whole view (adw_navigation_view_size_allocate()), so content
// taller than the view scrolls in its scrolled window, which shrinks to the
// view, instead of overflowing the page.
gtkTest("adw-navigation-view-scrolled", (native, web) => {
  const slack = (view: WidgetSnapshot) => view.height - findChild(view, "scrolledwindow").height;
  gtkAssert.numbersEqual(slack(native), slack(web), "view height - scrolled window height");
});
