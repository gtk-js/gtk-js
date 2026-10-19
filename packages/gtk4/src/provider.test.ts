// Unit tests — no Playwright/cargo preload needed.

import { GtkTheme, type SystemColorScheme } from "@gtk-js/gtk-css";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vite-plus/test";
import {
  GtkProvider,
  getSystemScheme,
  insertThemeCSS,
  subscribeSystemScheme,
  suppressTransitions,
} from "./provider.tsx";

/** Just enough of `document` for suppressTransitions(). */
function fakeDocument() {
  const head: { id: string; textContent: string; remove(): void }[] = [];
  const document = {
    head: { appendChild: (element: (typeof head)[number]) => head.push(element) },
    getElementById: (id: string) => head.find((element) => element.id === id) ?? null,
    // No server-rendered stylesheets to take over (#131's adoptStylesheet()).
    querySelector: () => null,
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

/** A `matchMedia` whose `prefers-color-scheme: dark` the test flips, like the OS setting. */
function fakeMatchMedia(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    get matches() {
      return dark;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => query);
  return {
    listeners,
    setDark(value: boolean) {
      dark = value;
      for (const listener of listeners) listener();
    },
  };
}

/** Like an "auto" theme: its CSS follows the system scheme it's given. */
class SchemeTheme extends GtkTheme {
  calls: (SystemColorScheme | undefined)[] = [];
  getCSS(systemScheme?: SystemColorScheme) {
    this.calls.push(systemScheme);
    return `${systemScheme ?? "auto"}.css`;
  }
}

test("follows the system scheme, like AdwStyleManager follows the setting", () => {
  const media = fakeMatchMedia(false);
  const onChange = vi.fn();
  const unsubscribe = subscribeSystemScheme(onChange);
  expect(getSystemScheme()).toBe("light");
  media.setDark(true);
  expect(onChange).toHaveBeenCalledOnce();
  expect(getSystemScheme()).toBe("dark");
  unsubscribe();
  expect(media.listeners.size).toBe(0);
});

test("an OS scheme change swaps the theme CSS with transitions off", () => {
  vi.useFakeTimers();
  const head = fakeDocument();
  const media = fakeMatchMedia(false);
  const theme = new SchemeTheme();
  let remove = insertThemeCSS(theme.getCSS(getSystemScheme()));
  vi.advanceTimersByTime(250);
  expect(head.map((element) => element.textContent)).toEqual(["light.css"]);

  // What GtkProvider does when the store notifies it: the effect's cleanup, then the new CSS.
  subscribeSystemScheme(() => {
    remove?.();
    remove = insertThemeCSS(theme.getCSS(getSystemScheme()));
  });
  media.setDark(true);
  expect(head.map((element) => element.id)).toEqual(["gtk-js-switching", "gtk-js-theme"]);
  expect(head[1]?.textContent).toBe("dark.css");
  vi.advanceTimersByTime(250);
  expect(head).toHaveLength(1);
});

test("another provider's identical CSS isn't parsed again", () => {
  fakeDocument();
  insertThemeCSS("light.css");
  const theme = document.getElementById("gtk-js-theme")!;
  let text = theme.textContent;
  const write = vi.fn((value: string) => (text = value));
  Object.defineProperty(theme, "textContent", { get: () => text, set: write });
  expect(insertThemeCSS("light.css")).toBeUndefined();
  expect(write).not.toHaveBeenCalled();
  insertThemeCSS("dark.css");
  expect(write).toHaveBeenCalledWith("dark.css");
});

test("the server doesn't know the system scheme, so auto themes keep following the media query", () => {
  fakeMatchMedia(true);
  const theme = new SchemeTheme();
  renderToStaticMarkup(createElement(GtkProvider, { theme, children: null }));
  expect(theme.calls).toEqual([undefined]);
});
