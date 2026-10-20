import { type Browser, chromium, firefox, type Page } from "playwright";
import { inject } from "vite-plus/test";
import { debugLog } from "./debug.ts";

declare global {
  var __testBrowsers: Record<string, Browser>;
  var __testPages: Record<string, Page>;
  var __nativeServerPort: number;
  var __testSetup: Promise<void> | undefined;
}

/**
 * Connects to the browsers tests/global-setup.ts launched (it also closes them) and opens
 * the gallery in each.
 */
async function connect(): Promise<void> {
  const endpoints = inject("browserEndpoints");
  const galleryUrl = `http://127.0.0.1:${inject("webServerPort")}/gallery`;

  const entries = await Promise.all(
    [chromium, firefox].map(async (type) => {
      const endpoint = endpoints[type.name()];
      if (endpoint == null) throw new Error(`No ${type.name()} was launched`);
      const browser = await type.connect(endpoint);
      const page = await browser.newPage({
        viewport: { width: 1600, height: 1200 },
        deviceScaleFactor: 1,
      });
      await page.goto(galleryUrl);
      await page.waitForSelector(`[data-case="button-text-default"] [data-testid="target"]`);
      // Close the menu the split-button-open case opens: it's a modal popover,
      // which takes the next press outside it (as GTK's autohide popovers do)
      // from whichever test clicks first.
      await page.keyboard.press("Escape");
      return [type.name(), browser, page] as const;
    }),
  );
  debugLog("setup", "browsers connected, gallery loaded");

  globalThis.__testBrowsers = Object.fromEntries(entries.map(([name, browser]) => [name, browser]));
  globalThis.__testPages = Object.fromEntries(entries.map(([name, , page]) => [name, page]));
  globalThis.__nativeServerPort = inject("nativeServerPort");
}

// Test files share one worker (see the `native` project in vite.config.ts), so this runs
// once, before the first file. If it fails, every file fails with that error at once,
// instead of trying again for each.
await (globalThis.__testSetup ??= connect());
