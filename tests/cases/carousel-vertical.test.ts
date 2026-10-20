import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// A vertical carousel keeps its size and stacks its pages downwards, each as
// tall as the carousel (they expand) and 12px apart: only the first shows.
gtkTest("carousel-vertical", (native, web) => {
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
