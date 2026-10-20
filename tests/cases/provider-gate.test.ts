// GtkProvider keeps its content hidden (but laid out) until the theme CSS and computed
// expand are in place. Web only: there's no native counterpart.

import type { Page } from "playwright";
import { expect, inject, test } from "vite-plus/test";

const PROVIDER = "[data-gtk-provider]";

const state = (page: Page) =>
  page.$eval(PROVIDER, (provider) => ({
    ready: provider.hasAttribute("data-gtk-ready"),
    visibility: getComputedStyle(provider).visibility,
    width: provider.getBoundingClientRect().width,
    height: provider.getBoundingClientRect().height,
    // GtkLabel's display comes from layout.css, its font from the theme.
    label: [
      getComputedStyle(provider.querySelector(".gtk-label")!).display,
      getComputedStyle(provider.querySelector(".gtk-label")!).fontFamily,
    ],
  }));

for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  const url = (page: string) => `http://127.0.0.1:${inject("webServerPort")}/${page}`;

  async function withPage(run: (page: Page) => Promise<void>, javaScriptEnabled = true) {
    const context = await browser.newContext({ javaScriptEnabled });
    try {
      await run(await context.newPage());
    } finally {
      await context.close();
    }
  }

  test(`provider-gate client render shows its first frame (${browserName})`, () =>
    withPage(async (page) => {
      await page.goto(url("provider-gate-client"));
      await page.waitForFunction(() => window.gateFirstFrame);
      expect(await page.evaluate(() => window.gateFirstFrame)).toEqual({
        ready: true,
        visibility: "visible",
      });
    }));

  test(`provider-gate server HTML is styled but hidden until hydrated (${browserName})`, () =>
    withPage(async (page) => {
      const errors: string[] = [];
      page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
      await page.goto(url("provider-gate-ssr"));
      await page.waitForFunction(() => window.hydrate);
      const before = await state(page);
      expect(before).toMatchObject({ ready: false, visibility: "hidden" });
      // Hidden, not display: none: it's already laid out.
      expect(before.width).toBeGreaterThan(0);
      // The reset, layout and theme CSS are in the server HTML, once each.
      expect(before.label).toEqual(["inline-flex", expect.stringContaining("Cantarell")]);
      expect(
        await page.$$eval("[data-precedence]", (s) => s.map((e) => e.id || e.dataset.href)),
      ).toEqual(["gtk-js-reset", "gtk-js-theme"]);
      const html = await page.$eval("#root", (root) => root.innerHTML);

      await page.evaluate(() => window.hydrate!());
      await page.waitForFunction(() => window.gateFirstFrame);
      // Revealed in the frame the theme CSS arrived in.
      expect(await page.evaluate(() => window.gateFirstFrame)).toEqual({
        ready: true,
        visibility: "visible",
      });
      expect(await page.$eval(PROVIDER, (p) => p.getAttribute("aria-busy"))).toBeNull();
      // Hydrating takes the server's stylesheets over, and nothing moves.
      expect(await page.$$eval("[data-precedence]", (s) => s.map((e) => e.id))).toEqual([
        "gtk-js-reset",
        "gtk-js-theme",
      ]);
      expect(
        await page.$$eval("style", (s) => s.filter((e) => e.id.startsWith("gtk-js")).length),
      ).toBe(2);
      const after = await state(page);
      expect(after).toMatchObject({
        width: before.width,
        height: before.height,
        label: before.label,
      });
      expect(errors).toEqual([]); // No hydration mismatch.

      // Without JavaScript nothing would reveal it, so it isn't hidden at all.
      await withPage(async (noJS) => {
        await noJS.setContent(html);
        expect(await state(noJS)).toMatchObject({ ready: false, visibility: "visible" });
      }, false);
    }));

  test(`provider-gate waits for a cssHref stylesheet (${browserName})`, () =>
    withPage(async (page) => {
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      await page.route("**/provider-gate.css", async (route) => {
        await released;
        await route.fulfill({
          contentType: "text/css",
          body: ".gtk-label { color: rgb(1, 2, 3); }",
        });
      });
      await page.goto(url("provider-gate-href"));
      await page.waitForSelector(".gtk-label", { state: "attached" });
      await page.waitForTimeout(200);
      expect(await state(page)).toMatchObject({ ready: false, visibility: "hidden" });

      release();
      await page.waitForSelector(`${PROVIDER}[data-gtk-ready]`);
      expect(await state(page)).toMatchObject({ ready: true, visibility: "visible" });
      expect(await page.$eval(".gtk-label", (l) => getComputedStyle(l).color)).toBe("rgb(1, 2, 3)");
    }));
}
