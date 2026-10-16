import { type Browser, chromium, firefox, type Page } from "playwright";
import { inject } from "vite-plus/test";

declare global {
  var __testBrowsers: Record<string, Browser>;
  var __testPages: Record<string, Page>;
  var __nativeServerPort: number;
}

function debugLog(message: string): void {
  if (process.env.GTK_JS_TEST_DEBUG != null) {
    console.error(`[setup] ${message}`);
  }
}

async function createHostPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1,
  });
  return page;
}

// Test files share one worker (see the `native` project in vite.config.ts), so the
// browsers and their gallery pages are set up once, before the first file.
if (globalThis.__testPages == null) {
  const webServerPort = inject("webServerPort");

  const [chromiumBrowser, firefoxBrowser] = await Promise.all([
    chromium.launch({ headless: true }),
    firefox.launch({ headless: true }),
  ]);
  debugLog("browsers launched");

  const [chromiumHostPage, firefoxHostPage] = await Promise.all([
    createHostPage(chromiumBrowser),
    createHostPage(firefoxBrowser),
  ]);
  await Promise.all([
    chromiumHostPage.goto(`http://127.0.0.1:${webServerPort}/gallery`),
    firefoxHostPage.goto(`http://127.0.0.1:${webServerPort}/gallery`),
  ]);
  await Promise.all([
    chromiumHostPage.waitForSelector(`[data-case="button-text-default"] [data-testid="target"]`),
    firefoxHostPage.waitForSelector(`[data-case="button-text-default"] [data-testid="target"]`),
  ]);

  globalThis.__testBrowsers = {
    chromium: chromiumBrowser,
    firefox: firefoxBrowser,
  };
  globalThis.__testPages = {
    chromium: chromiumHostPage,
    firefox: firefoxHostPage,
  };
  globalThis.__nativeServerPort = inject("nativeServerPort");
}
