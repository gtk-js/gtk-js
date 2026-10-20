// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwButtonRow } from "./button-row.tsx";

const icons = { ImageMissing: () => <svg data-icon="image-missing" /> } as never;
const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<IconProvider value={icons}>{node}</IconProvider>);

describe("AdwButtonRow", () => {
  test("its icons are images, and an unknown name shows image-missing like GtkImage", () => {
    const html = render(
      <AdwButtonRow title="Delete" startIconName="edit-delete-symbolic" endIconName="GoNext" />,
    );
    expect(html).toMatch(
      /<span class="gtk-image icon start" data-valign="center"><svg data-icon="image-missing"/,
    );
    expect(html).toContain('class="gtk-image icon end"');
  });

  test("the title ellipsizes instead of wrapping", () => {
    expect(render(<AdwButtonRow title="Add Calendar" />)).toMatch(
      /class="gtk-label title"[^>]*><span style="[^"]*text-overflow:ellipsis;white-space:pre"/,
    );
  });

  test("an insensitive row isn't focusable and is :disabled", () => {
    const html = render(<AdwButtonRow title="Delete" disabled />);
    expect(html).not.toContain("tabindex");
    expect(html).toMatch(/^<div[^>]*class="gtk-row button"[^>]*data-disabled="true"/);
    expect(html).toMatch(/class="gtk-label title"[^>]*data-disabled="true"/);
  });
});
