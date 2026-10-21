// The text a GtkTextView draws itself (each paragraph as tall as its rows to
// the nearest pixel, as GtkTextLayout has it) stays the textarea's: typing,
// undo, the keyboard, presses, drags and double and triple presses act on the
// text where it's drawn, and the cursor is drawn where the text is. Web only:
// the native harness doesn't type or press.

import type { Page } from "playwright";
import { expect, inject, test } from "vite-plus/test";

/** The textarea's value and selection. */
function state(page: Page, id: string) {
  return page.evaluate((id) => {
    const text = document.getElementById(id) as HTMLTextAreaElement;
    return { value: text.value, start: text.selectionStart, end: text.selectionEnd };
  }, id);
}

/** The client point a fraction of the way across a character the view draws. */
function pointAt(page: Page, id: string, offset: number, across = 0.25) {
  return page.evaluate(
    ({ id, offset, across }) => {
      const view = document.getElementById(id)!.parentElement!;
      const text = (document.getElementById(id) as HTMLTextAreaElement).value;
      const paragraph = text.slice(0, offset).split("\n").length - 1;
      const start = text.lastIndexOf("\n", offset - 1) + 1;
      // The paragraph's rows, each a text node.
      let local = offset - start;
      let node: Node | null = null;
      const rows = view
        .querySelectorAll(".gtk-textview-paragraph")
        [paragraph]!.querySelectorAll(".gtk-textview-row");
      for (const row of rows) {
        node = row.firstChild!;
        if (local < node.textContent!.length) break;
        local -= node.textContent!.length;
      }
      const range = document.createRange();
      range.setStart(node!, local);
      range.setEnd(node!, local + 1);
      const rect = range.getClientRects()[0]!;
      return { x: rect.left + rect.width * across, y: rect.top + rect.height / 2 };
    },
    { id, offset, across },
  );
}

/** The drawn cursor's rectangle, and the drawn text of each paragraph. */
function drawn(page: Page, id: string) {
  return page.evaluate((id) => {
    const view = document.getElementById(id)!.parentElement!;
    const cursor = view.querySelector<HTMLElement>(".gtk-textview-cursor");
    const box = cursor?.getBoundingClientRect();
    return {
      cursor: box ? { x: box.left, top: box.top, height: box.height } : null,
      blinks: cursor?.hasAttribute("data-blink") ?? false,
      paragraphs: Array.from(
        view.querySelectorAll(".gtk-textview-paragraph"),
        (p) => p.textContent?.slice(0, -1) ?? "",
      ),
    };
  }, id);
}

for (const [browserName, browser] of Object.entries(globalThis.__testBrowsers)) {
  test(`text-view-editing (${browserName})`, async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${inject("webServerPort")}/text-view-editing`);
      await page.locator("#proportional").waitFor();
      await page.waitForFunction(() =>
        document.querySelector("#editor")?.parentElement?.hasAttribute("data-gtk-drawn"),
      );

      // Each paragraph is as tall as its rows to the nearest pixel, and the
      // textarea, its own text unseen, fills the text window they make.
      for (const id of ["editor", "proportional"]) {
        const layout = await page.evaluate((id) => {
          const view = document.getElementById(id)!.parentElement!;
          const rowHeight = parseFloat(view.style.getPropertyValue("--gtk-textview-row-height"));
          const blocks = Array.from(view.querySelectorAll<HTMLElement>(".gtk-textview-paragraph"));
          const text = document.getElementById(id)!;
          return {
            heights: blocks.map((b) => b.getBoundingClientRect().height),
            expected: blocks.map((b) => {
              const rows = Math.round(
                b.firstElementChild!.getBoundingClientRect().height / rowHeight,
              );
              return Math.round(rows * rowHeight);
            }),
            total: blocks.reduce((sum, b) => sum + b.getBoundingClientRect().height, 0),
            textHeight: text.getBoundingClientRect().height,
            fill: getComputedStyle(text).webkitTextFillColor,
          };
        }, id);
        expect(layout.heights).toEqual(layout.expected);
        expect(layout.textHeight).toBe(layout.total);
        expect(layout.fill).toBe("rgba(0, 0, 0, 0)");
      }

      // A press places the cursor at the text drawn under it, and the cursor
      // is drawn there.
      const value = (await state(page, "editor")).value;
      const short = value.indexOf("short");
      let point = await pointAt(page, "editor", short + 2);
      await page.mouse.click(point.x, point.y);
      expect(await state(page, "editor")).toMatchObject({ start: short + 2, end: short + 2 });
      let seen = await drawn(page, "editor");
      expect(seen.cursor).not.toBeNull();
      const left = (await pointAt(page, "editor", short + 2, 0)).x;
      expect(Math.abs(seen.cursor!.x - left)).toBeLessThanOrEqual(1);
      expect(seen.blinks).toBe(true);

      // Typing goes to the textarea and is drawn; undo takes it back.
      await page.keyboard.type("XY");
      expect((await state(page, "editor")).value).toBe(value.replace("short", "shXYort"));
      expect((await drawn(page, "editor")).paragraphs[1]).toBe("shXYort");
      for (let i = 0; i < 3 && (await state(page, "editor")).value !== value; i++) {
        await page.keyboard.press("ControlOrMeta+z");
      }
      expect((await state(page, "editor")).value).toBe(value);
      await page.mouse.click(point.x, point.y);
      await page.keyboard.press("Enter");
      seen = await drawn(page, "editor");
      expect(seen.paragraphs).toEqual(
        value
          .slice(0, short + 2)
          .concat("\n", value.slice(short + 2))
          .split("\n"),
      );
      await page.keyboard.press("Backspace");

      // Home and End go to the paragraph's ends.
      await page.keyboard.press("End");
      expect((await state(page, "editor")).start).toBe(short + 5);
      await page.keyboard.press("Home");
      expect((await state(page, "editor")).start).toBe(short);

      // Dragging selects from the press to the pointer; Shift extends.
      point = await pointAt(page, "editor", 0);
      const to = await pointAt(page, "editor", 3);
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 3 });
      await page.mouse.up();
      expect(await state(page, "editor")).toMatchObject({ start: 0, end: 3 });
      const later = await pointAt(page, "editor", 8);
      await page.keyboard.down("Shift");
      await page.mouse.click(later.x, later.y);
      await page.keyboard.up("Shift");
      expect(await state(page, "editor")).toMatchObject({ start: 0, end: 8 });

      // A double press selects a word, a triple one the display line: the
      // second of the first paragraph's rows, to the third's start.
      point = await pointAt(page, "editor", value.indexOf("gamma") + 2, 0.5);
      await page.mouse.click(point.x, point.y, { clickCount: 2 });
      const gamma = value.indexOf("gamma");
      expect(await state(page, "editor")).toMatchObject({ start: gamma, end: gamma + 5 });
      const row = await page.evaluate(() => {
        // The first paragraph's second row, as the view draws it.
        const rows = document
          .querySelector("#editor")!
          .parentElement!.querySelector(".gtk-textview-paragraph")!
          .querySelectorAll(".gtk-textview-row");
        const second = rows[0]!.textContent!.length;
        return [second, second + rows[1]!.textContent!.length];
      });
      // Down keeps the x on the next display line; End goes to before its
      // last character, the line going on after it; Home to its start; Up
      // from there to the line before's.
      point = await pointAt(page, "editor", 2, 0);
      await page.mouse.click(point.x, point.y);
      await page.keyboard.press("ArrowDown");
      expect((await state(page, "editor")).start).toBe(row[0]! + 2);
      await page.keyboard.press("End");
      expect((await state(page, "editor")).start).toBe(row[1]! - 1);
      await page.keyboard.press("Home");
      expect((await state(page, "editor")).start).toBe(row[0]);
      await page.keyboard.press("Shift+ArrowUp");
      expect(await state(page, "editor")).toMatchObject({ start: 0, end: row[0] });

      point = await pointAt(page, "editor", row[0]! + 3, 0.5);
      await page.mouse.click(point.x, point.y, { clickCount: 3 });
      expect(await state(page, "editor")).toMatchObject({ start: row[0], end: row[1] });

      // The app's value wins: it upper-cases what's typed, which is drawn.
      await page.locator("#controlled").focus();
      await page.keyboard.type("ab");
      expect((await state(page, "controlled")).value).toBe("AB");
      expect((await drawn(page, "controlled")).paragraphs).toEqual(["AB"]);
      await page.locator("#controlled-source").focus();
      await page.keyboard.type("cd");
      await page.keyboard.press("Enter");
      expect((await state(page, "controlled-source")).value).toBe("CD\n");
      expect((await drawn(page, "controlled-source")).paragraphs).toEqual(["CD", ""]);

      // A view that isn't editable keeps its cursor, which doesn't blink, and
      // its text.
      point = await pointAt(page, "read-only", 4);
      await page.mouse.click(point.x, point.y);
      await page.keyboard.type("z");
      expect((await state(page, "read-only")).value).toBe("read only");
      seen = await drawn(page, "read-only");
      expect(seen.cursor).not.toBeNull();
      expect(seen.blinks).toBe(false);

      // No cursor where it isn't visible, or while insensitive.
      await page.locator("#no-cursor").focus();
      expect((await drawn(page, "no-cursor")).cursor).toBeNull();
      point = await pointAt(page, "disabled", 2);
      await page.mouse.click(point.x, point.y);
      expect((await drawn(page, "disabled")).cursor).toBeNull();

      // The textarea is what assistive technologies read; the drawing isn't.
      expect(
        await page.evaluate(() => {
          const text = document.getElementById("editor")!;
          const layer = text.parentElement!.querySelector(".gtk-textview-text-layer")!;
          return [text.getAttribute("aria-hidden"), layer.getAttribute("aria-hidden")];
        }),
      ).toEqual([null, "true"]);
    } finally {
      await context.close();
    }
  });
}
