// Unit tests — no Playwright/cargo preload needed.

import { GtkLabel } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwActionRow } from "./action-row.tsx";
import { AdwPreferencesGroup } from "./preferences-group.tsx";

describe("AdwPreferencesGroup", () => {
  test("renders its rows in its list on the server, so hydration doesn't move them", () => {
    const html = renderToStaticMarkup(
      <AdwPreferencesGroup title="Group" separateRows>
        <AdwActionRow title="Row 1" />
        <AdwActionRow title="Row 2" />
      </AdwPreferencesGroup>,
    );
    // The list is the box's first child, and has nothing but the rows.
    const list =
      '<div class="gtk-box gtk-box-layout vertical"><div role="list" class="gtk-list gtk-preferencesgroup-list boxed-list-separate"><div role="listitem" class="gtk-row"';
    expect(html).toContain(list);
    const rows = html.slice(html.indexOf(list) + list.length - 40).split('<div role="listitem"');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain(">Row 1</span>");
    expect(rows[2]).toMatch(/>Row 2<\/span><\/div><\/div><\/div><\/div><\/div><\/div><\/div>$/);
  });

  test("renders other children on the server too", () => {
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
