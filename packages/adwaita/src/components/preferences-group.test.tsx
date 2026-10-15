// Unit tests — no Playwright/cargo preload needed.
import { describe, expect, test } from "bun:test";
import { GtkLabel } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { AdwActionRow } from "./action-row.tsx";
import { AdwPreferencesGroup } from "./preferences-group.tsx";

describe("AdwPreferencesGroup", () => {
  test("renders its rows on the server, where they can't portal into the list", () => {
    const html = renderToStaticMarkup(
      <AdwPreferencesGroup title="Group">
        <AdwActionRow title="Row" />
        <GtkLabel label="Footer" />
      </AdwPreferencesGroup>,
    );
    expect(html).toContain(">Row</span>");
    expect(html).toContain(">Footer</span>");
    expect(html.indexOf(">Row</span>")).toBeLessThan(html.indexOf(">Footer</span>"));
  });
});
