import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

// A homogeneous box is n times its largest child (gtk_box_layout_compute_size()):
// "Much longer label" keeps one line and "A" is as wide. Each child is placed
// in its equal slot by its halign/valign (gtk_box_layout_allocate()) instead
// of filling it. Text widths differ by a few px between browsers.
gtkTest("box-homogeneous-natural", (native, web) => {
  // Native sizes are content sizes, web ones border-box sizes.
  const size = (w: WidgetSnapshot, isWeb: boolean) =>
    isWeb
      ? { width: w.width, height: w.height }
      : {
          width:
            w.width +
            w.padding.left +
            w.padding.right +
            w.border_widths.left +
            w.border_widths.right,
          height:
            w.height +
            w.padding.top +
            w.padding.bottom +
            w.border_widths.top +
            w.border_widths.bottom,
        };
  const measure = (root: WidgetSnapshot, isWeb: boolean) => {
    const [natural, aligned, vertical] = root.children!;
    const [a, long] = natural!.children!;
    const [, center] = aligned!.children!;
    const [end, vcenter] = vertical!.children!;
    return {
      a: size(a!, isWeb),
      long: size(long!, isWeb),
      center: size(center!, isWeb),
      centerMid: center!.x! + size(center!, isWeb).width / 2,
      endRight: size(vertical!, isWeb).width - end!.x! - size(end!, isWeb).width,
      end: size(end!, isWeb),
      vcenter: size(vcenter!, isWeb),
      vcenterMid: vcenter!.y! + size(vcenter!, isWeb).height / 2,
    };
  };
  const n = measure(native, false);
  const w = measure(web, true);
  const text = { tolerance: 5, reason: "text width differs between browsers" };
  gtkAssert.numbersEqual(w.long.width, w.a.width, "equal slots");
  gtkAssert.numbersClose(n.long.width, w.long.width, text, "largest child's width");
  gtkAssert.numbersEqual(n.long.height, w.long.height, "largest child's height");
  gtkAssert.numbersClose(n.center.width, w.center.width, text, "centered child's width");
  gtkAssert.numbersClose(
    n.centerMid,
    w.centerMid,
    { tolerance: 1, reason: "rounding" },
    "centered child's center",
  );
  gtkAssert.numbersEqual(n.endRight, w.endRight, "end-aligned child's right gap");
  gtkAssert.numbersEqual(n.end.height, w.end.height, "end-aligned child's height");
  gtkAssert.numbersEqual(n.vcenter.height, w.vcenter.height, "valign center child's height");
  gtkAssert.numbersClose(
    n.vcenterMid,
    w.vcenterMid,
    { tolerance: 1, reason: "rounding" },
    "valign center child's center",
  );
});
