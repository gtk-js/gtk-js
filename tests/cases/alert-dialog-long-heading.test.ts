// A heading too long for an AdwAlertDialog's width wraps: allocate_heading()
// shows the wrapping title-4 label once the title-2 one doesn't fit the width
// the dialog gives it (DIALOG_MIN_WIDTH here, with one response), and
// measure_heading() gives the heading the smaller label's minimum, so it never
// widens the dialog's contents. The text view below wraps in that width too.
// Web only: the native harness can't present a dialog as a case widget.

import { expect, inject, test } from "vite-plus/test";

for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  test(`alert-dialog-long-heading (${browserName})`, async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${inject("webServerPort")}/alert-dialog-long-heading`);
      await page.locator(".gtk-dialog .response-area").waitFor();
      // Past the opening animation.
      await page.waitForTimeout(1000);
      const layout = await page.evaluate(() => {
        const sheet = document.querySelector(".gtk-dialog .gtk-sheet")!;
        const s = sheet.getBoundingClientRect();
        const wider = Array.from(sheet.querySelectorAll("*"))
          .filter((el) => el.getBoundingClientRect().right > s.right + 0.5)
          .map((el) => el.className);
        return {
          sheetWidth: s.width,
          heading: sheet.querySelector(".heading-bin > .gtk-label")!.className,
          messageAreaWidth: sheet.querySelector(".message-area")!.getBoundingClientRect().width,
          wider,
        };
      });
      expect(layout.sheetWidth).toBeCloseTo(300, 0);
      expect(layout.heading).toContain("title-4");
      expect(layout.messageAreaWidth).toBeLessThanOrEqual(layout.sheetWidth + 0.5);
      expect(layout.wider).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
