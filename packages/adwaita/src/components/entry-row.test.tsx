// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwEntryRow } from "./entry-row.tsx";

const icons = { DocumentEdit: () => <svg /> };
const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<IconProvider value={icons as never}>{node}</IconProvider>);
/** The opening tag of the first element with a class. */
const tag = (html: string, cssClass: string) =>
  html.match(new RegExp(`<[^>]*class="[^"]*\\b${cssClass}\\b[^"]*"[^>]*>`))?.[0] ?? "";

describe("AdwEntryRow", () => {
  test("is activatable, so the theme highlights it on hover like adw-entry-row.ui", () => {
    expect(tag(render(<AdwEntryRow title="Name" />), "gtk-row")).toMatch(
      /class="gtk-row entry activatable"/,
    );
  });

  test("its text is labelled by the title, which ellipsizes", () => {
    const html = render(<AdwEntryRow title="Name" />);
    const id = tag(html, "gtk-label").match(/id="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(tag(html, "gtk-text")).toContain(`aria-labelledby="${id}"`);
    expect(html).toMatch(/text-overflow:ellipsis[^>]*>Name</);
  });

  test("an insensitive row takes no input and dims its edit icon", () => {
    const html = render(
      <AdwEntryRow
        title="Name"
        disabled
        prefixWidget={<span>prefix</span>}
        suffixWidget={<button type="button">suffix</button>}
      />,
    );
    expect(tag(html, "gtk-row")).toContain("data-disabled");
    expect(tag(html, "gtk-text")).toContain('disabled=""');
    expect(tag(html, "edit-icon")).toContain("data-disabled");
    expect(tag(html, "prefixes")).toContain("inert");
    expect(tag(html, "suffixes")).toContain("inert");
  });
});
