import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("expander-expanded", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);

  // The child sits right under the one-line title.
  const [nativeBox, webBox] = [findChild(native, "box"), findChild(web, "box")];
  const [nativeTitle, nativeChild] = nativeBox.children!;
  const [webTitle, webChild] = webBox.children!;
  expect(webTitle.height).toBeCloseTo(nativeTitle.height, 0);
  expect(webChild.y).toBeCloseTo(nativeChild.y!, 0);
});
