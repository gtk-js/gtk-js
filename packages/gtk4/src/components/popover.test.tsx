import { describe, expect, test } from "vite-plus/test";
import { arrowGap, insetTriangle, resizeToFit, shadowExtents } from "./popover.tsx";

describe("GtkPopover arrow", () => {
  // libadwaita's popover shadow, as Chromium computes it.
  const adwaitaShadow = "rgba(0, 0, 0, 0.09) 0px 1px 5px 1px, rgba(0, 0, 0, 0.05) 0px 2px 14px 3px";

  test("shadow extents match gtk_css_shadow_value_get_extents()", () => {
    expect(shadowExtents(adwaitaShadow)).toEqual({ top: 21, right: 23, bottom: 25, left: 23 });
    expect(shadowExtents("none")).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(shadowExtents(`rgb(0, 0, 0) 0px 0px 0px 2px inset, ${adwaitaShadow}`).left).toBe(23);
  });

  test("the tip points at the anchor and the base centers on it", () => {
    expect(arrowGap(80, 160, 23, 23, 0)).toEqual({ initial: 68, tip: 80, final: 92 });
  });

  test("near the popover's edge, the base reaches into the shadow", () => {
    // A menu button 6px from the window edge, its popover slid against it.
    expect(arrowGap(22, 164, 23, 23, 0)).toEqual({ initial: 10, tip: 22, final: 34 });
    expect(arrowGap(-15, 164, 23, 23, 0)).toEqual({ initial: -23, tip: -15, final: 1 });
  });

  test("at the surface's end the base stops and the arrow leans", () => {
    expect(arrowGap(-30, 164, 23, 23, 0)).toEqual({ initial: -23, tip: -23, final: 1 });
    expect(arrowGap(2, 164, 0, 0, 15)).toEqual({ initial: 15, tip: 2, final: 39 });
  });

  test("the fill triangle is the arrow inside its stroke", () => {
    // A symmetric 24×13 arrow, stroked 1px inside its sides.
    const [left, tip, right] = insetTriangle(
      [
        [0, 13],
        [12, 0],
        [24, 13],
      ],
      1,
    );
    const side = Math.hypot(12, 13) / 13;
    expect(left[0]).toBeCloseTo(side);
    expect(right[0]).toBeCloseTo(24 - side);
    expect([left[1], right[1]]).toEqual([13, 13]);
    expect(tip[0]).toBeCloseTo(12);
    expect(tip[1]).toBeCloseTo(Math.hypot(12, 13) / 12);
  });
});

describe("GtkPopover placement", () => {
  test("what still doesn't fit is cut off, as GDK_ANCHOR_RESIZE does", () => {
    // A long menu below a button at y=46 in a 600px viewport.
    expect(resizeToFit({ x: 10, y: 46, width: 120, height: 1300 }, 800, 600)).toEqual({
      x: 10,
      y: 46,
      width: 120,
      height: 554,
    });
    // Above the viewport's top, the start is cut off.
    expect(resizeToFit({ x: -20, y: -50, width: 100, height: 300 }, 800, 600)).toEqual({
      x: 0,
      y: 0,
      width: 80,
      height: 250,
    });
    // It fits: unchanged.
    expect(resizeToFit({ x: 5, y: 5, width: 50, height: 50 }, 800, 600)).toEqual({
      x: 5,
      y: 5,
      width: 50,
      height: 50,
    });
  });
});
