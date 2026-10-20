import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("password-entry-natural-width", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);

  // gtk_password_entry_measure() measures only the text (GtkText's natural width
  // is 150px), and size_allocate() takes the peek icon and the 6px
  // border-spacing before it out of the text's width. Native sizes are
  // content-box ones, web ones border-box.
  const inset =
    web.padding.left + web.padding.right + web.border_widths.left + web.border_widths.right;
  expect(web.width - inset).toBeCloseTo(native.width, 0);
  for (const entry of [native, web]) {
    const text = findChild(entry, "text");
    const peek = findChild(entry, "image");
    expect(text.width).toBeCloseTo(150 - 16 - 6, 0);
    expect(peek.x! - (text.x! + text.width)).toBeCloseTo(6, 0);
    expect(peek.width).toBeCloseTo(16, 0);
  }
});
