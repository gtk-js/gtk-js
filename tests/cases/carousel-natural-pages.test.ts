import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// adw_carousel_size_allocate(): no page expands, so every page is as wide as
// the widest child (100px), the carousel's full height, and spaced 12px apart.
// The current page is centered, so the next one shows beside it.
gtkTest("carousel-natural-pages", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  gtkAssert.numbersEqual(native.width, web.width, "carousel width");
  gtkAssert.numbersEqual(native.height, web.height, "carousel height");
  const nativePages = native.children!;
  const webPages = web.children!;
  expect(webPages).toHaveLength(nativePages.length);
  nativePages.forEach((page, i) => {
    const webPage = webPages[i]!;
    gtkAssert.numbersEqual(page.x!, webPage.x!, `page ${i} x`);
    gtkAssert.numbersEqual(page.y!, webPage.y!, `page ${i} y`);
    gtkAssert.numbersEqual(page.width, webPage.width, `page ${i} width`);
    gtkAssert.numbersEqual(page.height, webPage.height, `page ${i} height`);
  });
});
