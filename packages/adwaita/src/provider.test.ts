// Unit tests — no Playwright/cargo preload needed.
import { AdwaitaTheme } from "@gtk-js/theme-adwaita";
import { expect, test } from "vite-plus/test";

/** Only auto.css switches by itself, through `prefers-color-scheme`. */
const isAuto = (css: string) => css.includes('[data-color-scheme="dark"]');

test("an auto theme follows the system scheme through the light and dark builds", () => {
  const theme = new AdwaitaTheme();
  expect(isAuto(theme.getCSS("light"))).toBe(false);
  expect(isAuto(theme.getCSS("dark"))).toBe(false);
  expect(theme.getCSS("dark")).toBe(new AdwaitaTheme({ colorScheme: "dark" }).getCSS());
  expect(theme.getCSS("light")).toBe(new AdwaitaTheme({ colorScheme: "light" }).getCSS());
});

test("auto.css until the system scheme is known, on the server and while hydrating", () => {
  expect(isAuto(new AdwaitaTheme().getCSS())).toBe(true);
});

test("a forced scheme ignores the system's", () => {
  const dark = new AdwaitaTheme({ colorScheme: "dark" });
  expect(dark.getCSS("light")).toBe(dark.getCSS());
});
