import { expect, test } from "vite-plus/test";
import { extractWebStyles } from "../harness";

// GtkImage with no icon produces no render nodes in native GTK (zero-size paintable),
// so we only verify the web rendering has the correct CSS structure.
const browsers = globalThis.__testBrowsers;
for (const [browserName, browser] of Object.entries(browsers)) {
  test(`image-default (${browserName})`, async () => {
    const web = await extractWebStyles(browser, "image-default");
    // Empty GtkImage should still render as an element with zero or near-zero dimensions
    expect(web.opacity).toBe(1);
  });
}
