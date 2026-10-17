// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { AdwEntryRow } from "./entry-row.tsx";
import { AdwPasswordEntryRow } from "./password-entry-row.tsx";

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<IconProvider value={{} as never}>{node}</IconProvider>);
const inputType = (html: string) => html.match(/<input[^>]*type="([^"]*)"/)?.[1];

test("only visibility hides an entry row's text, not its input purpose, like GtkText", () => {
  expect(inputType(render(<AdwEntryRow title="PIN" inputPurpose="password" />))).toBe("text");
  expect(inputType(render(<AdwEntryRow title="PIN" visibility={false} />))).toBe("password");
});

test("a password entry row starts hidden, with a flat image button to show it", () => {
  const html = render(<AdwPasswordEntryRow title="Password" />);
  expect(inputType(html)).toBe("password");
  const peek = html.match(
    /<div class="gtk-box gtk-box-layout horizontal suffixes">(<button[^>]*>)/,
  )?.[1];
  expect(peek).toMatch(/class="gtk-button flat image-button"/);
  expect(peek).toMatch(/title="Show Password"/);
});
