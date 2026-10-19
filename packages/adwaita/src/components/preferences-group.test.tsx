// Unit tests — no Playwright/cargo preload needed.

import { GtkButton, GtkLabel } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwActionRow } from "./action-row.tsx";
import { AdwPreferencesGroup, cursorRow } from "./preferences-group.tsx";

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

  test("is a group labelled by its title and described by its description, as markup", () => {
    const html = renderToStaticMarkup(
      <AdwPreferencesGroup title={"Title &amp; <i>more</i>"} description="With <b>bold</b>" />,
    );
    expect(html).toMatch(/^<div role="group" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/);
    const [, titleId, descriptionId] = html.match(
      /aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/,
    )!;
    expect(html).toContain(`id="${titleId}" class="gtk-label heading h4"`);
    expect(html).toContain(`id="${descriptionId}" class="gtk-label body dimmed description"`);
    expect(html).toContain('Title &amp; <span style="font-style:italic">more</span>');
    expect(html).toContain('With <span style="font-weight:bold">bold</span>');
  });

  test("a header with only a suffix is single-line", () => {
    const html = renderToStaticMarkup(
      <AdwPreferencesGroup headerSuffix={<GtkButton label="Add" />} />,
    );
    expect(html).toContain("header single-line");
  });

  test("the title ellipsizes and only the labels are centered in the header", () => {
    const html = renderToStaticMarkup(
      <AdwPreferencesGroup title="Title" headerSuffix={<GtkButton label="Add" />} />,
    );
    expect(html).not.toContain("align-items:center");
    expect(html).toContain('class="gtk-box gtk-box-layout vertical labels" data-valign="center"');
    expect(html).toContain("text-overflow:ellipsis");
  });
});

describe("cursorRow", () => {
  // Rows 20px tall, row 1 insensitive and row 3 not focusable.
  const rows = [0, 1, 2, 3, 4, 5, 6, 7].map(
    (i) =>
      ({
        tabIndex: i === 3 ? -1 : 0,
        hasAttribute: (name: string) => name === "data-disabled" && i === 1,
        getBoundingClientRect: () => ({ top: 10 + i * 20, height: 20 }),
      }) as unknown as HTMLElement,
  );
  const move = (from: number, key: string) => {
    const row = cursorRow(rows, rows[from]!, key);
    return row && rows.indexOf(row);
  };

  test("moves like gtk_list_box_move_cursor(), to any visible row", () => {
    expect(move(0, "ArrowDown")).toBe(1);
    expect(move(2, "ArrowUp")).toBe(1);
    expect(move(5, "Home")).toBe(0);
    expect(move(5, "End")).toBe(7);
    // A page is 100px: five rows.
    expect(move(1, "PageDown")).toBe(6);
    expect(move(6, "PageUp")).toBe(1);
    expect(move(5, "PageDown")).toBe(7);
  });

  test("fails past either end", () => {
    expect(move(0, "ArrowUp")).toBeUndefined();
    expect(move(7, "ArrowDown")).toBeUndefined();
    expect(move(0, "PageUp")).toBeUndefined();
    expect(move(7, "PageDown")).toBeUndefined();
    expect(move(0, "Home")).toBe(0);
  });
});
