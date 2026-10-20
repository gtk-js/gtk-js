import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

// GTK rounds a label's text size up to whole pixels (gtk_label_measure()), so
// each button's label is a whole number of pixels wide and the next button
// starts on a whole pixel. The two-line label is 36px tall, not its lines'
// 35.2px. Firefox has no calc-size() and keeps the text's fractional size,
// and its text widths differ from Pango's by a few pixels.
gtkTest("label-fractional-text", (native, web, browserName) => {
  const tolerance =
    browserName === "chromium"
      ? { tolerance: 0.1, reason: "whole pixels, like Pango's size rounded up" }
      : { tolerance: 5, reason: "no calc-size(); engine text widths" };
  const names = ["Save", "Flat", "Up", "Two lines"];
  names.forEach((name, i) => {
    const n = native.children![i]!;
    const w = web.children![i]!;
    gtkAssert.numbersClose(n.x!, w.x!, tolerance, `${name} x`);
    const nLabel = n.css_name === "label" ? n : n.children![0]!;
    const wLabel = w.css_name === "label" ? w : w.children![0]!;
    gtkAssert.numbersClose(nLabel.width, wLabel.width, tolerance, `${name} label width`);
    gtkAssert.numbersClose(nLabel.height, wLabel.height, tolerance, `${name} label height`);
  });
});
