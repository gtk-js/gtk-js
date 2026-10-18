// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { AdwHeaderBar } from "./header-bar.tsx";
import { AdwNavigationView } from "./navigation-view.tsx";

const icons = { GoPrevious: () => <svg /> };
const page = (tag: string) => ({
  tag,
  title: tag,
  children: (
    <section data-page={tag}>
      <AdwHeaderBar />
    </section>
  ),
});

/** Whether each page's header bar has a back button. */
function backButtons(stack: string[]): Record<string, boolean> {
  const html = renderToStaticMarkup(
    <IconProvider value={icons as never}>
      <AdwNavigationView stack={stack} pages={["root", "child", "grandchild"].map(page)} />
    </IconProvider>,
  );
  const sections = html.split("<section").slice(1);
  return Object.fromEntries(
    sections.map((s) => [/data-page="([^"]+)"/.exec(s)![1], s.includes("image-button back")]),
  );
}

test("a page has a back button when there's a page below it, like AdwBackButton", () => {
  // The root page stays as it was while a page is pushed over it: it doesn't
  // grow a back button during the transition.
  expect(backButtons(["root", "child"])).toEqual({ root: false, child: true });
  expect(backButtons(["root", "child", "grandchild"])).toEqual({
    root: false,
    child: true,
    grandchild: true,
  });
});

test("the view and its pages are groups, labelled by the page title", () => {
  const html = renderToStaticMarkup(
    <IconProvider value={icons as never}>
      <AdwNavigationView stack={["root", "child"]} pages={["root", "child"].map(page)} />
    </IconProvider>,
  );
  expect(html).toMatch(/^<div class="gtk-navigation-view gtk-bin-layout" role="group"/);
  expect(
    html.match(/class="gtk-navigation-view-page[^"]*" role="group" aria-label="[^"]*"/g),
  ).toEqual([
    'class="gtk-navigation-view-page gtk-bin-layout" role="group" aria-label="root"',
    'class="gtk-navigation-view-page gtk-bin-layout" role="group" aria-label="child"',
  ]);
});

test("the back button is an AdwBackButton: a widget holding button.image-button.back with a menu", () => {
  const html = renderToStaticMarkup(
    <IconProvider value={icons as never}>
      <AdwNavigationView stack={["root", "child"]} pages={["root", "child"].map(page)} />
    </IconProvider>,
  );
  expect(html).toContain(
    '<div class="gtk-widget gtk-bin-layout"><button class="gtk-button image-button back" type="button" aria-label="Back" aria-haspopup="menu" title="root">',
  );
});
