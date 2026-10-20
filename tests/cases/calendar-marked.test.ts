import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("calendar-marked", (native, web) => {
  // January 2024 starts on a Monday: after the 7 day names, the 5th is the
  // 12th label and the selected 15th the 22nd.
  const [nativeGrid, webGrid] = [findChild(native, "grid"), findChild(web, "grid")];
  for (const i of [12, 22]) {
    const [n, w] = [findChild(nativeGrid, "label", i), findChild(webGrid, "label", i)];
    expect(n.background_color).not.toBeNull();
    expect(compare(n, w).failures).toEqual([]);
  }
});
