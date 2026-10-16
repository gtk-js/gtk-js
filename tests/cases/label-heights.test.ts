import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// A label is as tall as its line: the font's ascent + descent at the default
// `line-height: normal` (1.2em for Cantarell, which browsers would round down
// to 17px at 11pt), or the theme's line height, rounded up to whole pixels.
gtkTest("label-heights", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const names = ["Label", "Body", "Caption", "Heading", "Title"];
  names.forEach((name, i) => {
    gtkAssert.numbersEqual(native.children![i]!.height, web.children![i]!.height, name);
  });
});
