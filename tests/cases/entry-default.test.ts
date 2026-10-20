import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("entry-default", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // GtkText's natural width is NAT_ENTRY_WIDTH, 150px (gtk_text_measure()).
  // Native sizes are content-box ones, web ones border-box.
  const inset =
    web.padding.left + web.padding.right + web.border_widths.left + web.border_widths.right;
  expect(web.width - inset).toBeCloseTo(native.width, 0);
  // gtk_entry_size_allocate() gives the text the entry's full height.
  for (const prop of ["y", "height"] as const) {
    expect(findChild(web, "text")[prop]).toBeCloseTo(findChild(native, "text")[prop]!, 0);
  }
});
