import { expect, test } from "vite-plus/test";
import { compare, extractWebStyles, findChild, getNativeSnapshot } from "../harness";

// A window control held down looks pressed. The controls prevent mousedown's
// default so a click doesn't move the focus, and Firefox then doesn't make
// them :active: they mark the press with data-pressed, which matches as
// :active, until the release.
const CASE = "headerbar-controls-pressed";
for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  test(`${CASE} (${browserName})`, async () => {
    const page = globalThis.__testPages[browserName];
    const close = page.locator(`[data-case="${CASE}"] [data-testid='target'] .close`);
    await close.hover();
    await page.mouse.down();
    try {
      expect(await close.getAttribute("data-pressed")).toBe("");
      await close.evaluate((el) =>
        Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
      );
      const [native, web] = await Promise.all([
        getNativeSnapshot(CASE),
        extractWebStyles(browser, CASE),
      ]);
      // The pressed colors are on the image (`windowcontrols > button:active > image`).
      const image = findChild(web, "image");
      expect(compare(findChild(native, "image"), image).failures).toEqual([]);
    } finally {
      await page.mouse.up();
    }
    expect(await close.getAttribute("data-pressed")).toBeNull();
  });
}
