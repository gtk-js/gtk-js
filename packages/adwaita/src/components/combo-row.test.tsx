// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwComboRow } from "./combo-row.tsx";

const icon = (name: string) => () => <svg data-icon={name} />;
const icons = { PanDown: icon("PanDown"), ApplicationsGraphics: icon("ApplicationsGraphics") };
const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<IconProvider value={icons as never}>{node}</IconProvider>);
const row = (html: string) => html.match(/^<div [^>]*>/)?.[0] ?? "";

describe("AdwComboRow", () => {
  test("sets no cursor: GTK shows the default arrow over the whole row", () => {
    const html = render(
      <AdwComboRow title="Color" items={["Red", "Green"]} iconName="ApplicationsGraphics" />,
    );
    expect(html).not.toContain("cursor");
  });

  test("shows the selected item in a list view of its own, like adw-combo-row.ui", () => {
    const html = render(<AdwComboRow title="Color" items={["Red", "Green"]} selected={1} />);
    // box.suffixes > listview.view.inline > row > box > label, then the arrow's box.
    expect(html).toMatch(
      /class="gtk-box gtk-box-layout horizontal suffixes"><div class="gtk-listview view inline"[^>]*><div class="gtk-row activatable"><div class="gtk-box gtk-box-layout horizontal"><span class="gtk-label"[^>]*><span[^>]*><span[^>]*>Green<\/span><\/span><\/span><\/div><\/div><\/div><div class="gtk-box gtk-box-layout horizontal" data-valign="center"><span class="gtk-image dropdown-arrow">/,
    );
    // The default factory's label: ellipsized, at most 20 characters wide.
    expect(html).toContain("--gtk-max-width-chars:20ch");
    expect(html).toContain("text-overflow:ellipsis");
  });

  test("puts its icon in the header as image.icon, like AdwActionRow", () => {
    const html = render(
      <AdwComboRow title="Color" items={["Red", "Green"]} iconName="ApplicationsGraphics" />,
    );
    expect(html).toContain(
      'class="gtk-box gtk-box-layout horizontal header" style="align-items:center"><span class="gtk-image icon">',
    );
    expect(html).not.toContain("prefixes");
  });

  test("with one item, has no arrow and isn't activatable (model_changed())", () => {
    const html = render(<AdwComboRow title="Color" items={["Only"]} />);
    expect(row(html)).toContain('class="gtk-row combo"');
    expect(row(html)).toContain('tabindex="0"');
    expect(html).not.toContain("dropdown-arrow");
  });

  test("insensitive: out of the Tab order, not activatable, its labels and images dimmed", () => {
    const html = render(
      <AdwComboRow
        title="Color"
        subtitle="Pick one"
        iconName="ApplicationsGraphics"
        items={["Red", "Green"]}
        disabled
      />,
    );
    expect(row(html)).toContain('class="gtk-row combo"');
    expect(row(html)).not.toContain("tabindex");
    expect(row(html)).toContain('aria-disabled="true"');
    expect(row(html)).toContain('data-disabled="true"');
    for (const node of [
      "gtk-image icon",
      "gtk-label title",
      "gtk-label subtitle",
      "gtk-image dropdown-arrow",
    ]) {
      expect(html).toMatch(new RegExp(`class="${node}"[^>]*data-disabled="true"`));
    }
    expect(html).toMatch(
      /class="gtk-label"[^>]*data-disabled="true"[^>]*><span[^>]*><span[^>]*>Red</,
    );
  });

  test("is a combo box labelled by its title", () => {
    const html = render(<AdwComboRow title="Color" subtitle="Pick one" items={["Red", "Green"]} />);
    const labelledBy = row(html).match(/aria-labelledby="([^"]+)"/)?.[1];
    const describedBy = row(html).match(/aria-describedby="([^"]+)"/)?.[1];
    expect(row(html)).toContain('role="combobox"');
    expect(html).toContain(`id="${labelledBy}" class="gtk-label title"`);
    expect(html).toContain(`id="${describedBy}" class="gtk-label subtitle"`);
  });
});
