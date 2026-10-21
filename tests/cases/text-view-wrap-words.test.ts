import { expect, test } from "vite-plus/test";
import { findChild, getNativeSnapshot } from "../harness";

// Character and word-character wrapping break rows where Pango does, with
// the hyphen it draws where it breaks inside a word (and room for it): each
// view's display lines start at native's offsets and are as tall.
const CASE = "text-view-wrap-words";
for (const [browserName, page] of Object.entries(globalThis.__testPages)) {
  test(`${CASE} (${browserName})`, async () => {
    const native = await getNativeSnapshot(CASE);
    const web = await page.evaluate((name) => {
      const views = document.querySelectorAll<HTMLElement>(
        `[data-case="${name}"] [data-testid='target'] > .gtk-textview`,
      );
      return Array.from(views, (view) => {
        // A display line starts at each row the view draws.
        const lines: number[] = [];
        let offset = 0;
        for (const paragraph of view.querySelectorAll(".gtk-textview-paragraph")) {
          for (const row of paragraph.querySelectorAll(".gtk-textview-row")) {
            lines.push(offset);
            offset += row.textContent!.length;
          }
        }
        return {
          lines,
          hyphens: view.querySelectorAll(".gtk-textview-row[data-hyphen]").length,
          height: view.getBoundingClientRect().height,
        };
      });
    }, CASE);
    expect(web).toHaveLength(4);
    web.forEach((view, i) => {
      const nativeView = findChild(native, "textview", i);
      expect(view.lines).toEqual(nativeView.text_lines);
      expect(view.height).toBe(nativeView.height);
      // Some rows break inside words, with a hyphen.
      if (i % 2 === 0) expect(view.hyphens).toBeGreaterThan(0);
    });
  });
}
