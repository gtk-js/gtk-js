import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("check-button-custom-child", (native, web) => {
  // Native root picks up check indicator's inset box-shadow (child leakage —
  // box-shadow: inset 0 0 0 2px on the check/radio indicator, not the root).
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("inset_shadows"))).toEqual([]);
  expect(compare(findChild(native, "check"), findChild(web, "check")).failures).toEqual([]);

  // Next to a taller child, the indicator keeps its size and is centered
  // (halign = valign = CENTER in gtk_check_button_init()). The native button
  // is as big as its test window; native sizes are content-box ones, web ones
  // border-box.
  const vertical = (box: typeof web) => box.padding.top + box.padding.bottom;
  const contentBoxes = [
    [native, native.height, (check: typeof web) => check.height + vertical(check)],
    [web, web.height - vertical(web), (check: typeof web) => check.height],
  ] as const;
  const heights = contentBoxes.map(([button, height, borderBoxHeight]) => {
    const check = findChild(button, "check");
    expect(check.y).toBeCloseTo((height - borderBoxHeight(check)) / 2, 0);
    return borderBoxHeight(check);
  });
  expect(heights[1]).toBeCloseTo(heights[0], 0);
});
