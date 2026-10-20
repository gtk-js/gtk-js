// Unit tests — no Playwright/cargo preload needed.

import { GtkProvider } from "@gtk-js/gtk4";
import { createGtkIcon } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwStatusPage } from "./status-page.tsx";

describe("AdwStatusPage", () => {
  test("is a group labelled by its title and described by its description, as markup", () => {
    const html = renderToStaticMarkup(
      <AdwStatusPage title="No <b>Results</b>" description={"Use <b>bold</b> &amp; more"} />,
    );
    const [, titleId, descriptionId] = html.match(
      /^<div role="group" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/,
    )!;
    // The title isn't markup (adw-status-page.ui).
    expect(html).toContain(`id="${titleId}" class="gtk-label title"`);
    expect(html).toContain("No &lt;b&gt;Results&lt;/b&gt;");
    expect(html).toContain(`id="${descriptionId}" class="gtk-label body description"`);
    expect(html).toContain('Use <span style="font-weight:bold">bold</span> &amp; more');
  });

  test("the theme sizes the icon", () => {
    const icons = { DialogInformation: createGtkIcon("DialogInformation", [["path", {}]]) };
    for (const className of [undefined, "compact"]) {
      const html = renderToStaticMarkup(
        <GtkProvider icons={icons}>
          <AdwStatusPage iconName="DialogInformation" className={className} />
        </GtkProvider>,
      );
      expect(html).toContain("width:var(--gtk-icon-size, 16px);height:var(--gtk-icon-size, 16px)");
    }
  });
});
