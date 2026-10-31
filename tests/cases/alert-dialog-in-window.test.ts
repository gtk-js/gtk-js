// An AdwAlertDialog open when its GtkWindow first renders moves into the
// window once the window's element is known (FloatingSheet), as new elements.
// It still follows the window's size: a 760×480 window isn't narrow or short
// (adw-dialog.c's breakpoints), so the dialog is DIALOG_PREFERRED_WIDTH wide
// and its responses are laid out for that width. Web only: the native harness
// can't present a dialog as a case widget.

import { expect, inject, test } from "vite-plus/test";

for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  test(`alert-dialog-in-window (${browserName})`, async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto(`http://127.0.0.1:${inject("webServerPort")}/alert-dialog-in-window`);
      await page.locator(".gtk-window .gtk-dialog .response-area").waitFor();
      // Past the opening animation.
      await page.waitForTimeout(1000);
      const layout = await page.evaluate(() => {
        const dialog = document.querySelector(".gtk-window .gtk-dialog")!;
        const sheet = dialog.querySelector(".gtk-sheet")!;
        const buttons = Array.from(dialog.querySelectorAll(".response-area > .gtk-button"));
        return {
          classes: Array.from(dialog.classList),
          sheetWidth: sheet.getBoundingClientRect().width,
          sheetOpacity: getComputedStyle(sheet).opacity,
          // Side by side: the buttons share a row.
          oneRow: new Set(buttons.map((b) => Math.round(b.getBoundingClientRect().top))).size === 1,
          stacked: dialog.querySelector(".response-area")!.classList.contains("compact"),
        };
      });
      expect(layout.classes).not.toContain("narrow");
      expect(layout.classes).not.toContain("short");
      expect(layout.sheetOpacity).toBe("1");
      expect(layout.sheetWidth).toBeGreaterThanOrEqual(300);
      expect(layout.stacked).toBe(!layout.oneRow);
      expect(errors.filter((e) => e.includes("NaN"))).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
