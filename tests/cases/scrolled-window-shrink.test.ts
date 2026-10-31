// A scrolled window narrows with its parent: its minimum width is its
// scrollbars' and its min-content-width, not its child's
// (gtk_scrolled_window_measure()), and a wrapping text view rewraps. The
// horizontal scrollbar's slider, sized for the wider window, must not keep it
// wide (gtk_range_measure_trough() counts only the slider's minimum).
// Web only: it checks a resize, which the native snapshot doesn't have.

import { expect, inject, test } from "vite-plus/test";

for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  test(`scrolled-window-shrink (${browserName})`, async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${inject("webServerPort")}/scrolled-window-shrink`);
      await page.locator(".gtk-scrolledwindow .gtk-textview").waitFor();
      // Laid out (and the scrollbars measured) at the wide size first.
      await page.waitForTimeout(300);
      const wide = await page.evaluate(
        () => document.querySelector(".gtk-scrolledwindow")!.getBoundingClientRect().width,
      );
      expect(wide).toBeCloseTo(600, 0);
      await page.evaluate(() => {
        (document.getElementById("shrink-box") as HTMLElement).style.width = "200px";
      });
      await page.waitForTimeout(300);
      const narrow = await page.evaluate(() => {
        const sw = document.querySelector(".gtk-scrolledwindow")!;
        const text = sw.querySelector(".gtk-textview > .gtk-text") as HTMLElement;
        return {
          width: sw.getBoundingClientRect().width,
          textScrolls: text.scrollWidth > text.clientWidth + 0.5,
        };
      });
      expect(narrow.width).toBeCloseTo(200, 0);
      expect(narrow.textScrolls).toBe(false);
    } finally {
      await context.close();
    }
  });
}
