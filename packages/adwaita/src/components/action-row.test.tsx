// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwActionRow } from "./action-row.tsx";

const rowTag = (html: string) => html.match(/^<div[^>]*>/)?.[0] ?? "";

describe("AdwActionRow", () => {
  test("is a Tab stop whether or not it's activatable, like every GtkListBoxRow", () => {
    expect(rowTag(renderToStaticMarkup(<AdwActionRow title="Plain" />))).toContain('tabindex="0"');
    expect(rowTag(renderToStaticMarkup(<AdwActionRow title="Plain" activatable />))).toContain(
      'tabindex="0"',
    );
  });

  test("an insensitive row isn't focusable, and its nodes are :disabled", () => {
    const html = renderToStaticMarkup(
      <AdwActionRow title="Title" subtitle="Subtitle" iconName="EditDelete" activatable disabled />,
    );
    expect(rowTag(html)).not.toContain("tabindex");
    // Never picked, it shows no hover or press.
    expect(rowTag(html)).toContain('class="gtk-row"');
    expect(rowTag(html)).toContain('data-disabled="true"');
    expect(html.match(/<span[^>]*class="gtk-label (title|subtitle)"[^>]*>/g)).toHaveLength(2);
    for (const label of html.match(/<span[^>]*class="gtk-label[^>]*>/g) ?? []) {
      expect(label).toContain('data-disabled="true"');
    }
    expect(html).toMatch(/class="gtk-image icon"[^>]*data-disabled="true"/);
  });

  test("an empty title isn't shown, like string_is_not_empty", () => {
    const html = renderToStaticMarkup(<AdwActionRow title="" subtitle="Only a subtitle" />);
    expect(html).not.toContain("gtk-label title");
    expect(html).toContain("gtk-label subtitle");
  });

  test("title and subtitle are Pango markup unless useMarkup is false", () => {
    const html = renderToStaticMarkup(
      // A JSX attribute would unescape the entity, as GtkBuilder's XML does.
      <AdwActionRow title={"Terms &amp; <b>Conditions</b>"} subtitle="<i>italic</i>" />,
    );
    expect(html).toContain('Terms &amp; <span style="font-weight:bold">Conditions</span>');
    expect(html).toContain('<span style="font-style:italic">italic</span>');
    expect(renderToStaticMarkup(<AdwActionRow title="<b>raw</b>" useMarkup={false} />)).toContain(
      "&lt;b&gt;raw&lt;/b&gt;",
    );
  });

  test("a selectable subtitle can be selected, with the text cursor", () => {
    const subtitle = (html: string) => html.match(/class="gtk-label subtitle"[^>]*/)?.[0] ?? "";
    const html = renderToStaticMarkup(
      <AdwActionRow title="Value" subtitle="42" subtitleSelectable />,
    );
    expect(subtitle(html)).toContain('tabindex="0"');
    expect(subtitle(html)).toContain("user-select:text;cursor:text");
    expect(
      subtitle(renderToStaticMarkup(<AdwActionRow title="Value" subtitle="42" />)),
    ).not.toContain("user-select");
  });

  test("only the title box is centered in the header, as in adw-action-row.ui", () => {
    const html = renderToStaticMarkup(<AdwActionRow title="Title" suffixWidget={<button />} />);
    expect(html).toMatch(/class="gtk-box gtk-box-layout horizontal header"(?![^>]*align-items)/);
    expect(html).toMatch(/class="gtk-box gtk-box-layout vertical title" data-valign="center"/);
  });

  test("the deprecated iconName shows image.icon between the prefixes and the title", () => {
    const html = renderToStaticMarkup(
      <AdwActionRow title="Title" iconName="EditDelete" prefixWidget={<span id="prefix" />} />,
    );
    expect(html.indexOf('id="prefix"')).toBeLessThan(html.indexOf('class="gtk-image icon"'));
    expect(html.indexOf('class="gtk-image icon"')).toBeLessThan(html.indexOf("vertical title"));
  });

  test("an activatable widget makes the row activatable", () => {
    const html = renderToStaticMarkup(
      <AdwActionRow title="Title" activatableWidget={{ current: null }} />,
    );
    expect(rowTag(html)).toContain('class="gtk-row activatable"');
  });
});
