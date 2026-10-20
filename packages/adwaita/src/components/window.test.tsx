// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwHeaderBar } from "./header-bar.tsx";
import { AdwWindow } from "./window.tsx";

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<IconProvider value={{} as never}>{node}</IconProvider>);

describe("AdwWindow", () => {
  test("is a GtkWindow whose content gets the whole window, in its dialog host", () => {
    const html = render(<AdwWindow maximized content={<span>Content</span>} />);
    expect(html).toMatch(
      /^<div class="gtk-window background csd maximized"><div class="gtk-bin-layout"[^>]*><div class="gtk-dialog-host gtk-bin-layout"><div class="[^"]*gtk-bin-layout"[^>]*><span>Content<\/span>/,
    );
  });

  test("a header bar without a title widget shows its title, which isn't a tooltip", () => {
    const html = render(<AdwWindow title="My App" content={<AdwHeaderBar />} />);
    expect(html).toMatch(/class="gtk-label title"[^>]*><span[^>]*>My App<\/span>/);
    expect(html).not.toContain('title="My App"');
  });
});
