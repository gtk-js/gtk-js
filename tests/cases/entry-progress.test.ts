import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("entry-progress", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  // gtk_entry_size_allocate() puts the progress at the bottom of the content
  // box, across its width (on the web, the entry's padding insets it to it).
  const [nProgress, wProgress] = [findChild(native, "progress"), findChild(web, "progress")];
  expect(wProgress.y).toBeCloseTo(nProgress.y!, 0);
  expect(wProgress.height).toBeCloseTo(nProgress.height, 0);
  expect(findChild(web, "trough").width).toBeCloseTo(findChild(native, "trough").width, 0);
  expect(findChild(web, "progress", 1).width).toBeCloseTo(
    findChild(native, "progress", 1).width,
    0,
  );
});
