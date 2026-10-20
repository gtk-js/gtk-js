import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

/** The web snapshot's border-box size as content size, like GTK's widget size. */
function contentSize(web: WidgetSnapshot) {
  const { padding: p, border_widths: b } = web;
  return {
    width: web.width - p.left - p.right - b.left - b.right,
    height: web.height - p.top - p.bottom - b.top - b.bottom,
  };
}

// A link button's label doesn't wrap (gtk_button_set_label()): in a parent
// narrower than it, the link stays one line at its natural width.
gtkTest("link-narrow-parent", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const size = contentSize(web);
  gtkAssert.numbersEqual(native.height, size.height, "height");
  gtkAssert.numbersClose(native.width, size.width, {
    tolerance: 5,
    reason: "text widths differ by a few pixels between browsers",
  });
});
