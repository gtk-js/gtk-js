// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwPreferencesRow } from "./preferences-row.tsx";

describe("AdwPreferencesRow", () => {
  test("shows its child, not its title", () => {
    expect(renderToStaticMarkup(<AdwPreferencesRow title="Hidden" />)).not.toContain("Hidden");
    expect(
      renderToStaticMarkup(
        <AdwPreferencesRow title="Hidden">
          <span>Child</span>
        </AdwPreferencesRow>,
      ),
    ).toContain("<span>Child</span>");
  });

  test("is activatable and focusable by default, like GtkListBoxRow", () => {
    const html = renderToStaticMarkup(<AdwPreferencesRow title="Row" />);
    expect(html).toContain('class="gtk-row gtk-bin-layout activatable"');
    expect(html).toContain('tabindex="0"');
    expect(renderToStaticMarkup(<AdwPreferencesRow title="Row" activatable={false} />)).toContain(
      'class="gtk-row gtk-bin-layout"',
    );
  });

  test("an insensitive row isn't focusable and is :disabled", () => {
    const html = renderToStaticMarkup(<AdwPreferencesRow title="Row" disabled />);
    expect(html).not.toContain("tabindex");
    expect(html).toContain('data-disabled="true"');
  });
});
