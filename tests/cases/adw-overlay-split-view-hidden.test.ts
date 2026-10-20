import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

// show-sidebar=false hides the sidebar when not collapsed too: it slides out
// and the content takes the whole width (allocate_uncollapsed()).
gtkTest("adw-overlay-split-view-hidden", (native, web) => {
  const content = (view: WidgetSnapshot) =>
    view.children!.find((c) => c.css_classes?.includes("content-pane"))!;
  gtkAssert.numbersEqual(content(native).x!, content(web).x!, "content x");
  gtkAssert.numbersEqual(content(native).width, content(web).width, "content width");
});
