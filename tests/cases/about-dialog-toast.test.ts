// AdwAboutDialog's toast_overlay draws the "Copied to clipboard" toast over
// its navigation view (adw-about-dialog.ui), centered at the bottom like
// adw_toast_overlay_size_allocate(): the pages keep their size and the toast
// covers them, as natively. Web only: the native harness can't present a
// dialog as a case widget.

import { expect, inject, test } from "vite-plus/test";

for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  test(`about-dialog-toast (${browserName})`, async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${inject("webServerPort")}/about-dialog-toast`);
      const version = page.locator(".app-version");
      await version.waitFor();
      // The rect once it has stopped moving: the dialog and the toast slide in
      // with spring animations, which aren't CSS animations.
      const rect = (selector: string) =>
        page.evaluate(async (s) => {
          const frame = () => new Promise(requestAnimationFrame);
          const get = () => {
            const r = document.querySelector(s)!.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          };
          let last = get();
          for (let still = 0; still < 10; ) {
            await frame();
            const next = get();
            still = JSON.stringify(next) === JSON.stringify(last) ? still + 1 : 0;
            last = next;
          }
          return last;
        }, selector);
      const pagesBefore = await rect(".gtk-toastoverlay > .gtk-navigation-view");

      await version.click();
      await page.locator(".gtk-toast").waitFor();
      expect(
        await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied),
      ).toEqual(["1.2.3"]);
      const toast = await rect(".gtk-toast");
      const overlay = await rect(".gtk-toastoverlay");
      const pages = await rect(".gtk-toastoverlay > .gtk-navigation-view");

      // The pages keep their size: the toast doesn't take a row of its own.
      expect(pages).toEqual(pagesBefore);
      // It's drawn over them, centered at the bottom of the overlay.
      expect(toast.top).toBeGreaterThan(pages.top);
      expect(toast.bottom).toBeLessThan(pages.bottom);
      expect(overlay.bottom - toast.bottom).toBeLessThan(40);
      // Within a pixel: the overlay rounds the toast to whole pixels.
      const offCenter = (toast.left + toast.right) / 2 - (overlay.left + overlay.right) / 2;
      expect(Math.abs(offCenter)).toBeLessThanOrEqual(1);
    } finally {
      await context.close();
    }
  });
}
