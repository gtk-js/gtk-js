import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

const TEXT_WIDTH = {
  tolerance: 2,
  reason: "a quarter of Firefox's text width difference, plus GTK rounding to whole pixels",
};

// Adwaita's `frame > label { margin: 4px }` applies to the label and the child
// label. gtk_frame_size_allocate() puts the label at label-xalign of the free
// width (1 - label-xalign in RTL) and gives the child the rest of the frame.
gtkTest("frame-label-xalign", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  for (const [i, name] of ["xalign 0", "xalign 0.25", "xalign 0.25 RTL"].entries()) {
    const [nLabel, nChild] = native.children![i]!.children!;
    const [wLabel, wChild] = web.children![i]!.children!;
    gtkAssert.numbersEqual(nLabel!.y!, wLabel!.y!, `${name}: label y`);
    // The side the label's free width is measured from: the left in LTR, the
    // right in RTL.
    const edge = i === 2 ? (l: typeof nLabel) => l!.x! + l!.width : (l: typeof nLabel) => l!.x!;
    gtkAssert.numbersClose(edge(nLabel), edge(wLabel), TEXT_WIDTH, `${name}: label position`);
    gtkAssert.numbersEqual(nChild!.x!, wChild!.x!, `${name}: child x`);
    gtkAssert.numbersEqual(nChild!.y!, wChild!.y!, `${name}: child y`);
    gtkAssert.numbersEqual(nChild!.width, wChild!.width, `${name}: child width`);
  }
});
