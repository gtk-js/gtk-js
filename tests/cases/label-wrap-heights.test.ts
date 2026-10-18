import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// A wrapping label is as tall as its lines rounded up to whole pixels, like
// GTK's (gtk_label_measure()), so the label after it starts on a whole pixel.
gtkTest("label-wrap-heights", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  ["Body", "Default", "After"].forEach((name, i) => {
    gtkAssert.numbersEqual(native.children![i]!.height, web.children![i]!.height, `${name} height`);
    gtkAssert.numbersEqual(native.children![i]!.y!, web.children![i]!.y!, `${name} y`);
  });
});
