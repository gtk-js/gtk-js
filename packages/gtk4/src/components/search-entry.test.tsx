// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkSearchEntry } from "./search-entry.tsx";

const clearIcon = (html: string) => html.match(/<span class="gtk-image right"[^>]*>/)?.[0];

describe("GtkSearchEntry", () => {
  test("the clear icon is always measured, and only drawn with text (gtk_search_entry_measure())", () => {
    expect(clearIcon(renderToStaticMarkup(<GtkSearchEntry />))).toBe(
      '<span class="gtk-image right" title="Clear Entry" style="visibility:hidden">',
    );
    expect(clearIcon(renderToStaticMarkup(<GtkSearchEntry text="abc" />))).toBe(
      '<span class="gtk-image right" title="Clear Entry">',
    );
  });

  test("defaultValue seeds the uncontrolled text", () => {
    const html = renderToStaticMarkup(<GtkSearchEntry defaultValue="abc" />);
    expect(html).toContain('value="abc"');
    expect(html).not.toContain("defaultValue");
    expect(clearIcon(html)).not.toContain("hidden");
  });

  test("is one search box: the text's", () => {
    const html = renderToStaticMarkup(<GtkSearchEntry />);
    expect(html).not.toContain("role=");
    expect(html).toContain('type="search"');
  });

  test("an insensitive entry marks its node :disabled", () => {
    const html = renderToStaticMarkup(<GtkSearchEntry disabled />);
    expect(html).toMatch(/^<div class="gtk-entry search" data-disabled="true">/);
    expect(html).toMatch(/<input [^>]*disabled=""/);
  });
});
