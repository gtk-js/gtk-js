import { expect, test } from "vite-plus/test";
import { extractWebStyles } from "../harness";

// GtkImage with iconSize but no iconName produces no render nodes in native GTK
// (no paintable to snapshot), so we only verify the web rendering has the correct CSS structure.
const browsers = globalThis.__testBrowsers;
for (const [browserName, browser] of Object.entries(browsers)) {
  test(`image-no-icon-name (${browserName})`, async () => {
    const web = await extractWebStyles(browser, "image-no-icon-name");
    // Empty GtkImage with iconSize="normal" should still render as an element
    expect(web.opacity).toBe(1);
  });
}
