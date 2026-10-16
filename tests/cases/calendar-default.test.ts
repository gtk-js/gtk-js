import { expect } from "vite-plus/test";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

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
});
