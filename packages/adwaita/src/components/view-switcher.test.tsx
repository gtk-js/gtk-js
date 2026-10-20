// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { badgeText } from "./indicator-bin.tsx";
import { AdwViewSwitcher, AdwViewSwitcherBar, type AdwViewSwitcherPage } from "./view-switcher.tsx";

const icons = {
  GoHome: () => <svg data-icon="go-home" />,
  MissingIcon: () => <svg data-icon="image-missing" />,
};

const PAGES: AdwViewSwitcherPage[] = [
  { name: "home", title: "Home", iconName: "GoHome" },
  { name: "search", title: "Search" },
  { name: "settings", title: "Settings" },
];

function render(element: ReactElement): string {
  return renderToStaticMarkup(<IconProvider value={icons as never}>{element}</IconProvider>);
}

/** Each switcher button's markup. */
function buttons(html: string): string[] {
  return html.split("<button").slice(1);
}

/** An attribute of each button. */
function attr(html: string, name: string): (string | null)[] {
  return buttons(html).map((b) => {
    const tag = b.slice(0, b.indexOf(">"));
    const m = new RegExp(` ${name}(?:="([^"]*)")?`).exec(tag);
    return m ? (m[1] ?? "") : null;
  });
}

describe("AdwViewSwitcher", () => {
  test("buttons are flat toggles holding a stack with the policy's box", () => {
    for (const [policy, orientation] of [
      ["wide", "horizontal"],
      ["narrow", "vertical"],
    ] as const) {
      const html = render(<AdwViewSwitcher policy={policy} pages={PAGES} />);
      expect(attr(html, "class")[0]).toBe(`gtk-button flat toggle ${orientation}`);
      expect(attr(html, "type")[0]).toBe("button");
      expect(attr(html, "aria-pressed")[0]).toBeNull();
      expect(buttons(html)[0]).toMatch(
        new RegExp(
          `^[^>]*><div class="gtk-stack gtk-bin-layout"><div class="gtk-box gtk-box-layout ${orientation} ${policy}"[^>]*><span class="gtk-indicatorbin`,
        ),
      );
    }
  });

  test("a page without an icon shows image-missing", () => {
    const html = render(<AdwViewSwitcher pages={PAGES} />);
    expect(buttons(html).map((b) => /data-icon="([^"]+)"/.exec(b)?.[1])).toEqual([
      "go-home",
      "image-missing",
      "image-missing",
    ]);
  });

  test("uncontrolled, the first visible page is selected and is the Tab stop", () => {
    const pages = PAGES.map((page, i) => ({ ...page, visible: i > 0 }));
    const html = render(<AdwViewSwitcher pages={pages} />);
    expect(buttons(html)).toHaveLength(2);
    expect(attr(html, "aria-selected")).toEqual(["true", "false"]);
    expect(attr(html, "tabindex")).toEqual(["0", "-1"]);
  });

  test("only the active button is a Tab stop", () => {
    const html = render(<AdwViewSwitcher pages={PAGES} activePageName="settings" />);
    expect(attr(html, "data-checked")).toEqual([null, null, "true"]);
    expect(attr(html, "tabindex")).toEqual(["-1", "-1", "0"]);
  });

  test("disabled makes every button insensitive", () => {
    const html = render(<AdwViewSwitcher pages={PAGES} disabled />);
    expect(html).toMatch(/^<div role="tablist" class="gtk-viewswitcher[^"]*" data-disabled="true"/);
    expect(attr(html, "disabled")).toEqual(["", "", ""]);
  });

  test("needsAttention and badgeNumber mark the icon's indicator bin", () => {
    const html = render(
      <AdwViewSwitcher
        pages={[
          { name: "a", title: "A", needsAttention: true },
          { name: "b", title: "B", badgeNumber: 5, needsAttention: true },
          { name: "c", title: "C", badgeNumber: 1234 },
        ]}
      />,
    );
    const bins = buttons(html).map((b) => /<span class="(gtk-indicatorbin[^"]*)"/.exec(b)?.[1]);
    expect(bins).toEqual([
      "gtk-indicatorbin gtk-bin-layout needs-attention",
      "gtk-indicatorbin gtk-bin-layout needs-attention badge",
      "gtk-indicatorbin gtk-bin-layout badge",
    ]);
    const badges = buttons(html).map(
      (b) => /class="gtk-label numeric"[^>]*>(?:<span[^>]*>)?([^<]*)</.exec(b)?.[1] ?? null,
    );
    expect(badges).toEqual([null, "5", "999+"]);
    // The mask and the indicator always exist, before the child, as in AdwIndicatorBin.
    for (const b of buttons(html)) {
      expect(b).toMatch(
        /<span class="gtk-indicatorbin[^"]*"[^>]*><span class="gtk-mask"[^>]*><\/span><span class="gtk-indicator gtk-bin-layout">.*?<\/span><span class="gtk-image"/,
      );
    }
  });

  test("badge text like adw_get_badge_text()", () => {
    expect([0, 1, 999, 1000].map((n) => badgeText(n))).toEqual(["", "1", "999", "999+"]);
  });
});

describe("AdwViewSwitcherBar", () => {
  test("holds a narrow switcher as its action bar's center widget, 10px from the sides", () => {
    const html = render(<AdwViewSwitcherBar reveal pages={PAGES} />);
    expect(html).toMatch(
      /^<div class="gtk-viewswitcherbar gtk-bin-layout"><div class="gtk-actionbar"><div class="gtk-revealer[^"]*"><div class="gtk-box gtk-center-layout"[^>]*><div class="gtk-box gtk-box-layout horizontal start"><\/div><div role="tablist" class="gtk-viewswitcher gtk-box-layout horizontal homogeneous narrow" style="margin-inline:10px"/,
    );
  });

  test("only the action bar hides, and it needs two visible pages", () => {
    const shown = (element: ReactElement) => {
      const html = render(element);
      expect(html).toMatch(/^<div class="gtk-viewswitcherbar/);
      // The action bar keeps its children in a closed revealer (#128).
      return !/<div class="gtk-revealer[^"]*" style="[^"]*visibility:hidden/.test(html);
    };
    expect(shown(<AdwViewSwitcherBar reveal pages={PAGES} />)).toBe(true);
    expect(shown(<AdwViewSwitcherBar pages={PAGES} />)).toBe(false);
    const onePage = PAGES.map((page, i) => ({ ...page, visible: i === 0 }));
    expect(shown(<AdwViewSwitcherBar reveal pages={onePage} />)).toBe(false);
  });
});
