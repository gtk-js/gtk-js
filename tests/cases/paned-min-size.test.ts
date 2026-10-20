import { gtkAssert } from "../assert";
import { gtkTest } from "../harness";

const TEXT = { tolerance: 5, reason: "the buttons' text widths differ between browsers" };

// gtk_paned_compute_position() and gtk_paned_size_allocate(), with a box of
// buttons as the start child.
gtkTest("paned-min-size", (native, web) => {
  const [nativeNoShrink, nativeShrink, nativeNoResize] = native.children!;
  const [webNoShrink, webShrink, webNoResize] = web.children!;

  // shrink-start-child=false: the handle stops at the start child's minimum.
  let [start, handle] = webNoShrink!.children!;
  gtkAssert.numbersClose(nativeNoShrink!.children![1]!.x!, handle!.x!, TEXT, "handle x");
  gtkAssert.numbersClose(start!.width, handle!.x!, { tolerance: 1, reason: "rounding" }, "start");

  // Shrinkable: the start child keeps its minimum, against the handle at 60.
  [start, handle] = webShrink!.children!;
  gtkAssert.numbersEqual(nativeShrink!.children![1]!.x!, handle!.x!, "handle x");
  gtkAssert.numbersClose(nativeShrink!.children![0]!.x!, start!.x!, TEXT, "start child x");
  gtkAssert.numbersEqual(handle!.x!, start!.x! + start!.width, "start child's end");

  // resize-end-child=false: the end child keeps the rest (249px), not 0.
  // Native widths are content widths: the frame's borders aren't included.
  const [, nativeHandle, nativeEnd] = nativeNoResize!.children!;
  const [, webHandle, webEnd] = webNoResize!.children!;
  gtkAssert.numbersEqual(nativeHandle!.x!, webHandle!.x!, "handle x");
  gtkAssert.numbersEqual(nativeEnd!.x!, webEnd!.x!, "end child x");
  const { left, right } = webEnd!.border_widths;
  gtkAssert.numbersEqual(nativeEnd!.width, webEnd!.width - left - right, "end child width");
});
