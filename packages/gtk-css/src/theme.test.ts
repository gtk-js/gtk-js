// Unit tests — no Playwright/cargo preload needed.
import { afterEach, expect, test, vi } from "vite-plus/test";
import { resolveColorScheme } from "./theme.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("auto resolves to the system scheme GtkProvider passes", () => {
  vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
  expect(resolveColorScheme("auto", "light")).toBe("light");
  expect(resolveColorScheme("auto", "dark")).toBe("dark");
  expect(resolveColorScheme("light", "dark")).toBe("light");
});

test("without one, auto reads prefers-color-scheme, and is light on the server", () => {
  expect(resolveColorScheme("auto")).toBe("light");
  vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
  expect(resolveColorScheme("auto")).toBe("dark");
});
