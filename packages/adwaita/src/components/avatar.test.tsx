// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { AdwAvatar, initialsFontSize } from "./avatar.tsx";

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<IconProvider value={{} as never}>{node}</IconProvider>);
const colors = (html: string) => [...html.matchAll(/gtk-avatar (color\d+)/g)].map((m) => m[1]);

test("the color hashes the UTF-8 bytes like g_str_hash()", () => {
  // Classes from native AdwAvatar.
  const html = render(
    ["Alice Smith", "Bob Jones", "Émile Zola", "Łukasz Ż"].map((text) => (
      <AdwAvatar key={text} text={text} />
    )),
  );
  expect(colors(html)).toEqual(["color7", "color14", "color3", "color2"]);
});

test("a text-less avatar's color is stable across renders and never the last one", () => {
  const scene = Array.from({ length: 40 }, (_, i) => <AdwAvatar key={i} />);
  const html = render(scene);
  expect(render(scene)).toBe(html);
  expect(colors(html)).not.toContain("color14");
});

test("initials fit the square inside the circle, like update_font_size()", () => {
  // 96px: 96 / 1.4142 - (96 * 0.4 - 5) = 34.48px tall at most.
  expect(initialsFontSize(10, 18, 96)).toBeCloseTo(34.48, 2);
  expect(initialsFontSize(36, 18, 96)).toBeCloseTo(17.24, 2);
  // 16px: 16 / 1.4142 - 1.4 = 9.91px at most, scaled by 18 / 24.
  expect(initialsFontSize(24, 18, 16)).toBeCloseTo(7.44, 2);
});
