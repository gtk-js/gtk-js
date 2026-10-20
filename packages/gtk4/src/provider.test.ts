// Unit tests — no Playwright/cargo preload needed.

import { afterEach, expect, test, vi } from "vite-plus/test";
import { suppressTransitions } from "./provider.tsx";

/** Just enough of `document` for suppressTransitions(). */
function fakeDocument() {
  const head: { id: string; textContent: string; remove(): void }[] = [];
  const document = {
    head: { appendChild: (element: (typeof head)[number]) => head.push(element) },
    getElementById: (id: string) => head.find((element) => element.id === id) ?? null,
    createElement: () => {
      const element = {
        id: "",
        textContent: "",
        remove: () => head.splice(head.indexOf(element), 1),
      };
      return element;
    },
  };
  vi.stubGlobal("document", document);
  return head;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("transitions stay off for AdwStyleManager's SWITCH_DURATION after a switch", () => {
  vi.useFakeTimers();
  const head = fakeDocument();
  suppressTransitions();
  expect(head).toHaveLength(1);
  expect(head[0]?.textContent).toContain("transition: none !important");
  vi.advanceTimersByTime(249);
  expect(head).toHaveLength(1);
  vi.advanceTimersByTime(1);
  expect(head).toHaveLength(0);
});

test("another switch restarts the wait, with one stylesheet", () => {
  vi.useFakeTimers();
  const head = fakeDocument();
  suppressTransitions();
  vi.advanceTimersByTime(200);
  suppressTransitions();
  expect(head).toHaveLength(1);
  vi.advanceTimersByTime(200);
  expect(head).toHaveLength(1);
  vi.advanceTimersByTime(50);
  expect(head).toHaveLength(0);
});
