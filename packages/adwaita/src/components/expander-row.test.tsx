// Unit tests — no Playwright/cargo preload needed.

import { GtkButton, GtkListBox } from "@gtk-js/gtk4";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwActionRow } from "./action-row.tsx";
import { AdwExpanderRow } from "./expander-row.tsx";

/** The opening tag of the first element with all these classes. */
function tag(html: string, classes: string): string {
  const re = new RegExp(`<[a-z]+ [^>]*class="${classes}"[^>]*>`);
  const match = html.match(re);
  expect(match, classes).not.toBeNull();
  return match?.[0] ?? "";
}

const render = (row: ReactElement) => renderToStaticMarkup(row);

describe("AdwExpanderRow", () => {
  test("the row itself is :checked while expanded, like adw_expander_row_set_expanded()", () => {
    const html = render(
      <GtkListBox selectionMode="none" className="boxed-list">
        <AdwExpanderRow title="Row" expanded>
          <AdwActionRow title="Child" />
        </AdwExpanderRow>
      </GtkListBox>,
    );
    expect(tag(html, "gtk-row expander")).toContain("data-checked");
    expect(tag(html, "gtk-row header activatable")).not.toContain("data-checked");
    expect(tag(html, "gtk-image expander-row-arrow")).not.toContain("data-checked");
  });

  test("collapsed child rows stay mounted in a hidden revealer", () => {
    const html = render(
      <AdwExpanderRow title="Row">
        <AdwActionRow title="Child" />
      </AdwExpanderRow>,
    );
    expect(tag(html, "gtk-row expander")).not.toContain("data-checked");
    expect(tag(html, "gtk-revealer gtk-bin-layout")).toMatch(
      /height:0;overflow:clip;visibility:hidden/,
    );
    expect(html).toContain(">Child</span>");
  });

  test("it can't expand while expansion is disabled, and its arrow is insensitive", () => {
    const html = render(
      <AdwExpanderRow title="Row" expanded enableExpansion={false}>
        <AdwActionRow title="Child" />
      </AdwExpanderRow>,
    );
    expect(tag(html, "gtk-row expander")).not.toContain("data-checked");
    expect(tag(html, "gtk-row header activatable")).toContain('aria-expanded="false"');
    expect(tag(html, "gtk-image expander-row-arrow")).toContain("data-disabled");
  });

  test("the enable switch is a GtkSwitch in the header's suffixes, after the row's own", () => {
    const html = render(
      <AdwExpanderRow title="Row" showEnableSwitch suffixWidget={<GtkButton label="Suffix" />} />,
    );
    const switchTag = tag(html, "gtk-switch");
    expect(switchTag).toContain('role="switch"');
    expect(switchTag).toContain('tabindex="0"');
    expect(switchTag).toContain('aria-checked="true"');
    const suffixes = html.indexOf('class="gtk-box gtk-box-layout horizontal suffixes"');
    const ownSuffixes = html.indexOf(
      'class="gtk-box gtk-box-layout horizontal suffixes"',
      suffixes + 1,
    );
    expect(suffixes).toBeGreaterThan(-1);
    expect(ownSuffixes).toBeGreaterThan(suffixes);
    expect(html.indexOf("Suffix")).toBeLessThan(html.indexOf('class="gtk-switch"'));
    expect(html.indexOf('class="gtk-switch"')).toBeLessThan(html.indexOf("expander-row-arrow"));
  });

  test("prefixes are 12px apart, like adw_expander_row_add_prefix()", () => {
    const html = render(<AdwExpanderRow title="Row" prefixWidget={<GtkButton label="Prefix" />} />);
    expect(html).toMatch(
      /class="gtk-box gtk-box-layout horizontal prefixes"><div class="gtk-box gtk-box-layout horizontal" style="--gtk-spacing:12px">/,
    );
  });

  test("titleLines and subtitleLines ellipsize the labels", () => {
    const html = render(
      <AdwExpanderRow title="Row" subtitle="Sub" titleLines={1} subtitleLines={2} />,
    );
    expect(tag(html, "gtk-label title")).toContain("-webkit-line-clamp:1");
    expect(tag(html, "gtk-label subtitle")).toContain("-webkit-line-clamp:2");
  });

  test("an insensitive row blocks input and leaves the focus chain", () => {
    const html = render(
      <AdwExpanderRow title="Row" subtitle="Sub" showEnableSwitch disabled>
        <AdwActionRow title="Child" activatable />
      </AdwExpanderRow>,
    );
    const row = tag(html, "gtk-row expander");
    expect(row).toContain("inert");
    expect(row).toContain("data-disabled");
    const header = tag(html, "gtk-row header activatable");
    expect(header).not.toContain("tabindex");
    expect(header).toContain('aria-disabled="true"');
    for (const part of [
      "gtk-label title",
      "gtk-label subtitle",
      "gtk-switch",
      "gtk-image expander-row-arrow",
    ])
      expect(tag(html, part)).toContain("data-disabled");
  });
});
