// Unit tests — no Playwright/cargo preload needed.
import { describe, expect, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GtkMenuButton } from "./menu-button.tsx";
import { type GtkMenuModel, GtkPopoverMenu } from "./popover-menu.tsx";

// GtkPopover checks whether its portal target is an HTMLElement; there's no DOM
// when rendering to a string.
globalThis.HTMLElement ??= class {} as unknown as typeof HTMLElement;

const model: GtkMenuModel = [[{ label: "Preferences" }, { label: "About" }]];

/** The CSS classes of the open popover. */
function popoverClasses(props: { popover?: ReactNode; menuModel?: GtkMenuModel }): string[] {
  const html = renderToStaticMarkup(<GtkMenuButton label="Menu" active {...props} />);
  const classes = html.match(/class="(gtk-popover[^"]*)"/)?.[1];
  expect(classes).toBeDefined();
  return classes?.split(" ") ?? [];
}

describe("GtkMenuButton popover", () => {
  test("a menu model renders popover.menu", () => {
    expect(popoverClasses({ menuModel: model })).toContain("menu");
  });

  test("a GtkPopoverMenu passed as the popover renders popover.menu", () => {
    expect(popoverClasses({ popover: <GtkPopoverMenu model={model} /> })).toContain("menu");
  });

  test("custom popover content isn't a menu", () => {
    expect(popoverClasses({ popover: <div>Custom</div> })).not.toContain("menu");
  });
});

describe("GtkPopoverMenu focus", () => {
  test("the menu takes the focus and moves it between its items, which leave the page's tab order", () => {
    const html = renderToStaticMarkup(<GtkMenuButton label="Menu" active menuModel={model} />);
    expect(html).toMatch(/role="menu" tabindex="-1"/);
    const items = [...html.matchAll(/<button[^>]*role="menuitem"[^>]*>/g)].map((m) => m[0]);
    expect(items).toHaveLength(2);
    for (const item of items) expect(item).toContain('tabindex="-1"');
  });
});
