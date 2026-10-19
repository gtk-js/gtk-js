import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// The second label's max-width-chars doesn't narrow it: not filling the
// vertical box, it's measured for the height it gets at the box's width
// (gtk_widget_adjust_size_allocation()), so it's one line as wide as the
// first label, which has the same text. Text widths differ by a few pixels
// between engines; Firefox, without calc-size(), keeps it at 10 characters.
gtkTest("label-max-width-chars-start", (native, web, browserName) => {
  expect(compare(native, web).failures).toEqual([]);
  if (browserName === "firefox") return;
  const [nativeFirst, nativeLabel] = native.children!;
  const [webFirst, webLabel] = web.children!;
  gtkAssert.numbersEqual(
    nativeLabel!.width - nativeFirst!.width,
    webLabel!.width - webFirst!.width,
    "width difference",
  );
  gtkAssert.numbersClose(
    nativeLabel!.width,
    webLabel!.width,
    { tolerance: 5, reason: "text width" },
    "label width",
  );
  expect(Math.abs(nativeLabel!.height - webLabel!.height)).toBeLessThanOrEqual(1);
});
