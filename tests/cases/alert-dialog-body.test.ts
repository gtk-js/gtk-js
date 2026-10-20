// AdwAlertDialog's body scrolled window propagates its natural size
// (adw-alert-dialog.ui: propagate-natural-width/height), so a short body is
// shown whole, with nothing to scroll and no undershoot, as natively. Web
// only: the native harness can't present a dialog as a case widget.

import { expect, inject, test } from "vite-plus/test";

for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  test(`alert-dialog-body (${browserName})`, async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${inject("webServerPort")}/alert-dialog-body`);
      const body = page.locator(".body-scrolled-window .gtk-label.body");
      await body.waitFor();
      const layout = await page.evaluate(() => {
        const scroller = document.querySelector(".body-scrolled-window")!;
        const label = scroller.querySelector(".gtk-label.body")!;
        const s = scroller.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        return {
          bodyInsideScroller: l.top >= s.top - 0.5 && l.bottom <= s.bottom + 0.5,
          bodyHeight: l.height,
          undershoot: scroller.querySelectorAll(".gtk-undershoot").length,
          scrollable: scroller.scrollHeight > scroller.clientHeight + 0.5,
        };
      });
      expect(layout.bodyInsideScroller).toBe(true);
      expect(layout.bodyHeight).toBeGreaterThan(10);
      expect(layout.undershoot).toBe(0);
      expect(layout.scrollable).toBe(false);
    } finally {
      await context.close();
    }
  });
}
