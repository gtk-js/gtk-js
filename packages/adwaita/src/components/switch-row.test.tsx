// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { AdwSwitchRow } from "./switch-row.tsx";

/** The opening tag of the first element with this class. */
const tag = (html: string, cls: string) =>
  html.match(new RegExp(`<[a-z]+ [^>]*class="${cls}"[^>]*>`))?.[0] ?? "";

test("the row takes the focus, and its switch is a GtkSwitch that can't", () => {
  const html = renderToStaticMarkup(<AdwSwitchRow title="Wi-Fi" active />);
  const row = tag(html, "gtk-row activatable");
  expect(row).toMatch(/role="switch"/);
  expect(row).toMatch(/aria-checked="true"/);
  expect(row).toMatch(/tabindex="0"/);
  const sw = tag(html, "gtk-switch");
  expect(sw).toMatch(/tabindex="-1"/);
  expect(sw).toMatch(/aria-hidden="true"/);
  expect(sw).toMatch(/data-checked="true"/);
  // It takes the pointer: hover, press and drag are its own.
  expect(sw).not.toMatch(/pointer-events/);
});

test("an insensitive row is insensitive throughout, and can't be focused or hovered", () => {
  const html = renderToStaticMarkup(<AdwSwitchRow title="Wi-Fi" subtitle="Off" disabled />);
  const row = tag(html, "gtk-row");
  expect(row).toMatch(/aria-disabled="true"/);
  expect(row).toMatch(/data-disabled="true"/);
  expect(row).not.toMatch(/tabindex/);
  for (const cls of [
    "gtk-box gtk-box-layout horizontal header",
    "gtk-label title",
    "gtk-label subtitle",
    "gtk-switch",
  ]) {
    expect(tag(html, cls)).toMatch(/data-disabled="true"/);
  }
});

test("it takes AdwActionRow's prefixes, suffixes, lines and tooltip, the switch first", () => {
  const html = renderToStaticMarkup(
    <AdwSwitchRow
      title="Wi-Fi"
      titleLines={1}
      tooltipText="Wireless"
      prefixWidget={<i id="prefix" />}
      suffixWidget={<i id="suffix" />}
    >
      <i id="child" />
    </AdwSwitchRow>,
  );
  expect(tag(html, "gtk-row activatable")).toMatch(/data-gtk-tooltip="Wireless"/);
  expect(html).toContain(
    '<div class="gtk-box gtk-box-layout horizontal prefixes"><i id="prefix"></i></div>',
  );
  expect(tag(html, "gtk-label title")).toMatch(/-webkit-line-clamp:1/);
  const suffixes = html.slice(html.indexOf("suffixes"));
  expect(suffixes.indexOf("gtk-switch")).toBeLessThan(suffixes.indexOf('id="suffix"'));
  expect(suffixes.indexOf('id="suffix"')).toBeLessThan(suffixes.indexOf('id="child"'));
});
