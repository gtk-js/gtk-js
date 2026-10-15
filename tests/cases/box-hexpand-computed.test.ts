import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

function label(widget: WidgetSnapshot): WidgetSnapshot {
  const queue = [...(widget.children ?? [])];
  for (let node = queue.shift(); node; node = queue.shift()) {
    if (node.css_name === "label") return node;
    queue.push(...(node.children ?? []));
  }
  throw new Error(`no label in ${widget.css_name}`);
}

// The button expands because its label does and takes all the extra space.
// The center box and the box set not to expand don't, whatever their labels
// do: they're as wide as their labels.
gtkTest("box-hexpand-computed", (native, web) => {
  const sizes = (box: WidgetSnapshot, isWeb: boolean) => {
    const [button, centerBox, innerBox] = box.children!;
    const content = isWeb ? box.width - box.padding.left - box.padding.right : box.width;
    // Native widths are content widths, web ones border-box widths.
    const outer = (w: WidgetSnapshot) =>
      isWeb
        ? w.width
        : w.width + w.padding.left + w.padding.right + w.border_widths.left + w.border_widths.right;
    return {
      unused: content - outer(button!) - outer(centerBox!) - outer(innerBox!),
      centerBoxSlack: centerBox!.width - label(centerBox!).width,
      innerBoxSlack: innerBox!.width - label(innerBox!).width,
    };
  };
  const n = sizes(native, false);
  const w = sizes(web, true);
  gtkAssert.numbersEqual(n.unused, w.unused, "unused space");
  gtkAssert.numbersEqual(n.centerBoxSlack, w.centerBoxSlack, "center box's extra width");
  gtkAssert.numbersEqual(n.innerBoxSlack, w.innerBoxSlack, "inner box's extra width");
});
