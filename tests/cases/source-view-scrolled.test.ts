import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// 120 lines: the line numbers take room for three digits. A GtkSourceView is
// a GtkScrollable: the scrolled window allocates it its viewport, no viewport
// node between them.
gtkTest("source-view-scrolled", (native, web) => {
  expect(web.children?.[0]?.css_name).toBe("textview");
  for (const name of ["border", "gutterrenderer"]) {
    gtkAssert.numbersEqual(findChild(native, name).width, findChild(web, name).width, name);
  }
});
