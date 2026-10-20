import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("calendar-no-day-names", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("border_radius"))).toEqual([]);

  // The hidden day names' row is still requested (GtkGridLayout), and its
  // height shared among the weeks.
  const [nativeGrid, webGrid] = [findChild(native, "grid"), findChild(web, "grid")];
  expect(
    Math.abs(findChild(webGrid, "label", 7).y! - findChild(nativeGrid, "label", 7).y!),
  ).toBeLessThanOrEqual(1);
});
