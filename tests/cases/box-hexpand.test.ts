import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// The 300px box's extra space is shared equally by the children that expand:
// the label, and the vertical box, which expands because its label does. The
// two have the same text, so they end up the same width, and the three
// children fill the box. "End" doesn't expand.
gtkTest("box-hexpand", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const sizes = (box: WidgetSnapshot, isWeb: boolean) => {
    const [nested, label, end] = box.children!;
    const content = isWeb ? box.width - box.padding.left - box.padding.right : box.width;
    return {
      difference: nested!.width - label!.width,
      unused: content - nested!.width - label!.width - end!.width,
    };
  };
  const n = sizes(native, false);
  const w = sizes(web, true);
  gtkAssert.numbersEqual(n.difference, w.difference, "expanding children's difference");
  gtkAssert.numbersEqual(n.unused, w.unused, "unused space");
});
