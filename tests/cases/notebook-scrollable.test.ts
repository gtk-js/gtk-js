import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("notebook-scrollable", (native, web) => {
  // The tabs don't fit: the scroll arrows show at both ends of the tabs
  // (update_arrow_nodes(), gtk_notebook_allocate_arrows()).
  for (const i of [0, 1]) {
    const n = findChild(native, "arrow", i);
    const w = findChild(web, "arrow", i);
    expect(compare(n, w).failures).toEqual([]);
    expect(w.x).toBeCloseTo(n.x ?? 0, 0);
    expect(w.y).toBe(n.y);
  }

  // The current tab (Zeta) and the one before it are shown between them, at
  // about native's positions (they share out the space left).
  for (const i of [4, 5]) {
    const n = findChild(native, "tab", i);
    const w = findChild(web, "tab", i);
    expect(n.width).toBeGreaterThan(0);
    expect(Math.abs((w.x ?? 0) - (n.x ?? 0))).toBeLessThanOrEqual(5);
    expect(w.y).toBe(n.y);
  }
});
