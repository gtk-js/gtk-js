import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// The overlay's own children, looking through the web side's wrappers.
function children(overlay: WidgetSnapshot): WidgetSnapshot[] {
  return (overlay.children ?? []).flatMap((child) =>
    child.css_name === "overlay-child" ? (child.children ?? []) : [child],
  );
}

// Native widths are content widths, web ones border-box widths.
function outerWidth(widget: WidgetSnapshot, isWeb: boolean): number {
  if (isWeb) return widget.width;
  const { padding, border_widths } = widget;
  return widget.width + padding.left + padding.right + border_widths.left + border_widths.right;
}

// Only the child and overlays with measure size the overlay
// (gtk_overlay_layout_measure()). An overlay bigger than that overflows it,
// on the side its alignment points away from (gtk_overlay_get_child_position()).
gtkTest("overlay-measure", (native, web) => {
  expect(compare(findChild(native, "button"), findChild(web, "button")).failures).toEqual([]);

  for (const [box, isWeb] of [
    [native, false],
    [web, true],
  ] as const) {
    const unmeasured = findChild(box, "overlay", 0);
    const [button, start, end] = children(unmeasured);
    expect(unmeasured.width).toBeCloseTo(outerWidth(button!, isWeb), 0);
    expect(start!.width).toBeGreaterThan(unmeasured.width + 50);
    expect(start!.x).toBeCloseTo(0, 0);
    expect(end!.x! + end!.width).toBeCloseTo(unmeasured.width, 0);
    expect(end!.y! + end!.height).toBeCloseTo(unmeasured.height, 0);

    const measured = findChild(box, "overlay", 1);
    const [, label] = children(measured);
    expect(measured.width).toBeCloseTo(label!.width, 0);
  }

  // Text widths differ by a few pixels between browsers and GTK.
  for (const index of [0, 1]) {
    expect(
      Math.abs(findChild(web, "overlay", index).width - findChild(native, "overlay", index).width),
    ).toBeLessThan(5);
  }
});
