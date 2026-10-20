// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import type { GtkPositionType } from "../types.ts";
import { GtkNotebook, GtkNotebookPage, notebookKeyAction } from "./notebook.tsx";

function render(props: { tabPos?: GtkPositionType; page?: number; showTabs?: boolean } = {}) {
  return renderToStaticMarkup(
    <GtkNotebook {...props}>
      <GtkNotebookPage tabLabel="One">
        <input defaultValue="first" />
      </GtkNotebookPage>
      <GtkNotebookPage tabLabel="Two">
        <span>second</span>
      </GtkNotebookPage>
    </GtkNotebook>,
  );
}

const key = (k: string, mods: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}) => ({
  key: k,
  ctrlKey: !!mods.ctrl,
  altKey: !!mods.alt,
  shiftKey: !!mods.shift,
  metaKey: false,
});

describe("GtkNotebook structure", () => {
  test("keeps every page mounted, only the current one interactive", () => {
    const html = render({ page: 1 });
    expect(html).toContain('value="first"');
    expect(html).toContain("second");
    const panels = [...html.matchAll(/<div ([^>]*role="tabpanel"[^>]*)>/g)].map((m) => m[1]);
    expect(panels).toHaveLength(2);
    expect(panels[0]).toContain("inert");
    expect(panels[1]).not.toContain("inert");
    expect(panels[1]).toContain("data-current");
  });

  test("links each tab and its page, and the notebook takes the focus", () => {
    const html = render();
    const tab = html.match(/<div id="([^"]+)" class="gtk-tab"[^>]*aria-controls="([^"]+)"/);
    expect(tab).not.toBeNull();
    const [, tabId, pageId] = tab as RegExpMatchArray;
    expect(html).toContain(`id="${pageId}" role="tabpanel" aria-labelledby="${tabId}"`);
    expect(html).toMatch(/^<div class="gtk-notebook[^"]*" role="group" tabindex="0"/);
    expect(html).toContain(`aria-activedescendant="${tabId}"`);
    // The tabs themselves aren't focusable, as in GTK.
    expect(html).not.toMatch(/class="gtk-tab"[^>]*tabindex/);
  });

  test("without tabs, the notebook isn't focusable", () => {
    expect(render({ showTabs: false })).not.toContain("tabindex");
  });

  test("side tabs make a horizontal notebook and a vertical header", () => {
    expect(render({ tabPos: "top" })).toMatch(
      /class="gtk-notebook gtk-box-layout vertical frame".*class="gtk-header top gtk-box-layout horizontal"/,
    );
    expect(render({ tabPos: "left" })).toMatch(
      /class="gtk-notebook gtk-box-layout horizontal frame".*class="gtk-header left gtk-box-layout vertical"/,
    );
  });

  test("tab labels are GtkLabels", () => {
    expect(render()).toMatch(/class="gtk-tab"[^>]*><span class="gtk-label/);
  });
});

describe("notebookKeyAction", () => {
  test("arrows on the tabs switch pages, wrapping around", () => {
    expect(notebookKeyAction(key("ArrowRight"), "top", true, 0, 3)).toEqual({ page: 1 });
    expect(notebookKeyAction(key("ArrowRight"), "top", true, 2, 3)).toEqual({ page: 0 });
    expect(notebookKeyAction(key("ArrowLeft"), "top", true, 0, 3)).toEqual({ page: 2 });
    expect(notebookKeyAction(key("Home"), "top", true, 2, 3)).toEqual({ page: 0 });
    expect(notebookKeyAction(key("End"), "top", true, 0, 3)).toEqual({ page: 2 });
  });

  test("side tabs use Up/Down, like get_effective_direction()", () => {
    expect(notebookKeyAction(key("ArrowDown"), "left", true, 0, 3)).toEqual({ page: 1 });
    expect(notebookKeyAction(key("ArrowRight"), "left", true, 0, 3)).toEqual({ focus: "page" });
    expect(notebookKeyAction(key("ArrowLeft"), "right", true, 0, 3)).toEqual({ focus: "page" });
    expect(notebookKeyAction(key("ArrowUp"), "bottom", true, 0, 3)).toEqual({ focus: "page" });
  });

  test("Down moves into the page and Up comes back", () => {
    expect(notebookKeyAction(key("ArrowDown"), "top", true, 0, 3)).toEqual({ focus: "page" });
    expect(notebookKeyAction(key("ArrowUp"), "top", false, 0, 3)).toEqual({
      focus: "tabs",
      always: false,
    });
    expect(notebookKeyAction(key("ArrowUp", { ctrl: true }), "top", false, 0, 3)).toEqual({
      focus: "tabs",
      always: true,
    });
    // Arrows inside the page are the page's own.
    expect(notebookKeyAction(key("ArrowRight"), "top", false, 0, 3)).toBeNull();
  });

  test("Ctrl+PageUp/PageDown switch pages from anywhere, wrapping around", () => {
    expect(notebookKeyAction(key("PageDown", { ctrl: true }), "top", false, 2, 3)).toEqual({
      page: 0,
    });
    expect(notebookKeyAction(key("PageUp", { ctrl: true }), "top", true, 0, 3)).toEqual({
      page: 2,
    });
  });

  test("Alt+arrows reorder a reorderable current page only", () => {
    const reorderable = { reorderable: true };
    expect(
      notebookKeyAction(key("ArrowRight", { alt: true }), "top", true, 0, 3, reorderable),
    ).toEqual({ reorder: 1 });
    expect(notebookKeyAction(key("End", { alt: true }), "top", true, 0, 3, reorderable)).toEqual({
      reorder: 2,
    });
    expect(notebookKeyAction(key("Home", { alt: true }), "left", true, 2, 3, reorderable)).toEqual({
      reorder: 0,
    });
    expect(notebookKeyAction(key("ArrowRight", { alt: true }), "top", true, 0, 3)).toBeNull();
  });
});
