import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

// GTK dims insensitive labels and buttons with filter: opacity(), which the
// native snapshot reports as opacity and the web one doesn't read.
const dimming = (f: { property: string }) =>
  !f.property.startsWith("border_radius") && f.property !== "opacity";

gtkTest("calendar-disabled", (native, web) => {
  // .view:disabled's background, and calendar.view:disabled keeps the color.
  expect(compare(native, web).failures.filter(dimming)).toEqual([]);

  const [nativeHeader, webHeader] = [findChild(native, "header"), findChild(web, "header")];
  for (let i = 0; i < 4; i++) {
    const [n, w] = [findChild(nativeHeader, "button", i), findChild(webHeader, "button", i)];
    expect(compare(n, w).failures.filter(dimming)).toEqual([]);
  }
  const [n, w] = [
    findChild(findChild(native, "grid"), "label", 22),
    findChild(findChild(web, "grid"), "label", 22),
  ];
  expect(compare(n, w).failures.filter(dimming)).toEqual([]);
});
