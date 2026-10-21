// A text view draws its selection like GTK (gtk_text_layout_snapshot()):
// lines whose newline is selected fill to the right margin, and an unfocused
// view keeps the selection in the unfocused color, where browsers stop at
// the text and draw nothing. Web only (the native harness reads no selection
// from a snapshot): the rectangles and colors are GTK 4.22.4's and
// GtkSourceView 5.22's, measured in native screenshots of the same views
// (monospace "one two\nthree\nfour", 200px wide, light Adwaita).

import type { Page } from "playwright";
import { expect, inject, test } from "vite-plus/test";

// Each selected line's [left, right) in the view, from the native shots. Fills
// past the text stop a pixel short of the text window (SPACE_FOR_CURSOR) and
// the right margin.
const NATIVE = {
  "text-view": {
    across: [
      [35, 199],
      [0, 199],
      [0, 18],
    ],
    line: [null, [0, 199], null],
  },
  // The gutter is 30px wide, the margins 2px.
  "source-view": {
    across: [
      [67, 197],
      [32, 197],
      [32, 50],
    ],
    line: [null, [32, 197], null],
  },
} as const;
const FOCUSED = [194, 218, 247];
const UNFOCUSED = [235, 235, 235];

/** The selection's rows: the union of its rectangles on each 17px line, and its color over white. */
async function readSelection(page: Page, id: string) {
  return page.evaluate((id) => {
    const view = document.getElementById(id)!.parentElement!;
    const origin = view.getBoundingClientRect();
    const rows = new Map<number, { left: number; right: number }>();
    let color = "";
    for (const rect of view.querySelectorAll<HTMLElement>(".gtk-textview-selection")) {
      const r = rect.getBoundingClientRect();
      const row = Math.round((r.top - origin.top) / 17);
      const seen = rows.get(row);
      rows.set(row, {
        left: Math.min(seen?.left ?? Infinity, r.left - origin.left),
        right: Math.max(seen?.right ?? -Infinity, r.right - origin.left),
      });
      color = getComputedStyle(rect).backgroundColor;
    }
    const nativeSelection = getComputedStyle(view.querySelector("textarea")!, "::selection");
    // The color over white, as the browser composites it.
    const canvas = document.createElement("canvas").getContext("2d")!;
    canvas.fillStyle = "white";
    canvas.fillRect(0, 0, 1, 1);
    canvas.fillStyle = color || "transparent";
    canvas.fillRect(0, 0, 1, 1);
    const pixel = [...canvas.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    return {
      rows: [0, 1, 2].map((row) => {
        const r = rows.get(row);
        return r ? [Math.round(r.left), Math.round(r.right)] : null;
      }),
      color: pixel,
      browserSelection: nativeSelection.backgroundColor,
    };
  }, id);
}

function expectColor(actual: number[], expected: readonly number[]) {
  for (let i = 0; i < 3; i++) expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThanOrEqual(2);
}

async function select(page: Page, id: string, from: number, to: number) {
  await page.evaluate(
    ({ id, from, to }) => {
      const text = document.getElementById(id) as HTMLTextAreaElement;
      text.focus();
      text.setSelectionRange(from, to);
    },
    { id, from, to },
  );
  await page.waitForTimeout(100);
}

for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  test(`text-view-selection (${browserName})`, async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${inject("webServerPort")}/text-view-selection`);
      await page.locator("#source-view").waitFor();
      for (const id of ["text-view", "source-view"] as const) {
        // From "two" to "fo": across lines, the newlines selected.
        await select(page, id, 4, 16);
        let read = await readSelection(page, id);
        expect(read.rows).toEqual(NATIVE[id].across);
        expectColor(read.color, FOCUSED);
        // The browser's own selection isn't drawn as well.
        expect(read.browserSelection).toBe("rgba(0, 0, 0, 0)");

        await page.evaluate(() => (document.activeElement as HTMLElement).blur());
        await page.waitForTimeout(100);
        read = await readSelection(page, id);
        expect(read.rows).toEqual(NATIVE[id].across);
        expectColor(read.color, UNFOCUSED);

        // A triple click selects the line and its newline.
        const box = (await page.locator(`#${id}`).boundingBox())!;
        await page.mouse.click(box.x + box.width / 2, box.y + 17 + 8, { clickCount: 3 });
        await page.waitForTimeout(100);
        read = await readSelection(page, id);
        expect(read.rows).toEqual(NATIVE[id].line);
        expectColor(read.color, FOCUSED);
      }
    } finally {
      await context.close();
    }
  });
}
