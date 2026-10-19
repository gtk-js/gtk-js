// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkSearchBar } from "./search-bar.tsx";
import { GtkSearchEntry } from "./search-entry.tsx";

describe("GtkSearchBar", () => {
  test("a hidden bar keeps its entry in the revealer", () => {
    const html = renderToStaticMarkup(<GtkSearchBar child={<GtkSearchEntry />} />);
    expect(html).toMatch(
      /^<div class="gtk-searchbar gtk-bin-layout" role="search"><div class="gtk-revealer[^"]*" [^>]*visibility:hidden[^>]*><div class="gtk-box gtk-center-layout horizontal"[^>]*>.*<div class="gtk-entry search"/,
    );
  });

  test("the child is the center widget, the close button the end widget (gtk_search_bar_init())", () => {
    const html = renderToStaticMarkup(
      <GtkSearchBar searchModeEnabled showCloseButton child={<GtkSearchEntry />} />,
    );
    expect(html).toMatch(/<div class="gtk-center-layout-center"><div class="gtk-entry search"/);
    expect(html).toMatch(
      /<div class="gtk-center-layout-end"><button class="gtk-button image-button close" data-valign="center"/,
    );
  });
});
