import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("entry-primary-icon", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // gtk_entry_size_allocate(): the icon and the text are as tall as the entry,
  // the text starts after the icon and its 6px margin.
  for (const node of ["image", "text"]) {
    for (const prop of ["x", "y", "width", "height"] as const) {
      if (node === "text" && prop === "width") continue;
      expect(findChild(web, node)[prop], `${node}.${prop}`).toBeCloseTo(
        findChild(native, node)[prop]!,
        0,
      );
    }
  }
});
