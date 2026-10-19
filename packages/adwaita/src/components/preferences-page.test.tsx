// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwPreferencesPage } from "./preferences-page.tsx";

describe("AdwPreferencesPage", () => {
  test("is a group described by its description, as markup", () => {
    const html = renderToStaticMarkup(<AdwPreferencesPage description="Page <b>text</b>" />);
    const [, descriptionId] = html.match(/^<div role="group" aria-describedby="([^"]+)"/)!;
    expect(html).toContain(`id="${descriptionId}" class="gtk-label body dimmed description"`);
    expect(html).toContain('Page <span style="font-weight:bold">text</span>');
  });
});
