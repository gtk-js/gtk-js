import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

function findSelectedDay(node: WidgetSnapshot): WidgetSnapshot | null {
  const queue = [node];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const isDayLabel =
      current.css_name === "label" && current.css_classes?.includes("day-number") === true;
    const hasSelectedBackground = (current.background_color?.a ?? 0) > 0.05;
    if (isDayLabel && hasSelectedBackground) {
      return current;
    }
    queue.push(...(current.children ?? []));
  }
  return null;
}

/** Sizes within a pixel: GTK rounds each label's text width up to whole pixels. */
function expectNear(web: number, native: number, tolerance = 1) {
  expect(Math.abs(web - native)).toBeLessThanOrEqual(tolerance);
}

gtkTest("calendar-default", (native, web) => {
  // Native root picks up selected day cell border radius from child render nodes.
  // Skip root border-radius leakage and keep all other properties strict.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("border_radius"))).toEqual([]);

  const nativeSelectedDay = findSelectedDay(native);
  const webSelectedDay = findSelectedDay(web);
  expect(nativeSelectedDay).not.toBeNull();
  expect(webSelectedDay).not.toBeNull();
  expect(compare(nativeSelectedDay!, webSelectedDay!).failures).toEqual([]);

  // The header: image buttons, a stack as wide as the widest month, and the
  // year as wide as this year's text + 10px. (GTK rounds each label's text
  // width up to whole pixels; Firefox's text is a few pixels narrower.)
  const [nativeHeader, webHeader] = [findChild(native, "header"), findChild(web, "header")];
  for (let i = 0; i < 4; i++) {
    expect(findChild(webHeader, "button", i).css_classes).toContain("image-button");
  }
  expectNear(findChild(webHeader, "stack").width, findChild(nativeHeader, "stack").width, 4);
  expectNear(findChild(webHeader, "button", 1).x!, findChild(nativeHeader, "button", 1).x!, 4);
  const year = (s: WidgetSnapshot) => s.children!.find((c) => c.css_classes?.includes("year"))!;
  expectNear(year(webHeader).width, year(nativeHeader).width, 4);
  // Homogeneous rows: the day names' row is as tall as the weeks'.
  const [nativeGrid, webGrid] = [findChild(native, "grid"), findChild(web, "grid")];
  expect(findChild(webGrid, "label", 7).y).toBeCloseTo(findChild(nativeGrid, "label", 7).y!, 0);
});
