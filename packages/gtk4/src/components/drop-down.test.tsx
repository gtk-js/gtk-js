// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { IconProvider } from "../icon-context.tsx";
import { GtkDropDown } from "./drop-down.tsx";

const icons = { PanDown: () => <svg data-icon="PanDown" /> };
const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<IconProvider value={icons as never}>{node}</IconProvider>);
const items = ["Banana", "Apple"];

describe("GtkDropDown", () => {
  test("the button's child is a box: the selected item in a stack, then the arrow (gtkdropdown.ui)", () => {
    const html = render(<GtkDropDown items={items} selected={1} />);
    expect(html).toMatch(
      /<button type="button" class="gtk-button toggle"[^>]*><div class="gtk-box gtk-box-layout horizontal"><div class="gtk-stack" data-hexpand="true"><div class="gtk-row activatable gtk-bin-layout"><div class="gtk-box gtk-box-layout horizontal"><span class="gtk-label"[^>]*justify-content:flex-start[^>]*>Apple<\/span><\/div><\/div><\/div><span class="gtk-arrow"><svg data-icon="PanDown"><\/svg><\/span><\/div><\/button>/,
    );
    // Open, the button is only :checked; GTK gives it no .has-open-popup.
    expect(html).not.toContain("has-open-popup");
  });

  test("without a selected item, the stack shows (None)", () => {
    expect(render(<GtkDropDown items={items} selected={-1} />)).toMatch(
      /<div class="gtk-stack" data-hexpand="true"><span class="gtk-label"[^>]*justify-content:flex-start[^>]*>\(None\)<\/span><\/div>/,
    );
  });

  test("show-arrow false hides the arrow", () => {
    expect(render(<GtkDropDown items={items} showArrow={false} />)).not.toContain("gtk-arrow");
  });

  test("insensitive: its button is disabled, so it's dimmed and out of the Tab order", () => {
    const html = render(<GtkDropDown items={items} disabled />);
    expect(html).toMatch(/^<div class="gtk-dropdown" aria-disabled="true" data-disabled="true">/);
    expect(html).toMatch(/<button type="button" class="gtk-button toggle"[^>]* disabled="">/);
  });
});
