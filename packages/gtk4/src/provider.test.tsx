// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { GtkProvider, whenStylesheetLoaded } from "./provider.tsx";

const providerTag = (html: string) => html.match(/<div data-gtk-provider[^>]*>/)?.[0] ?? "";

test("server HTML keeps the content hidden but laid out until it's ready", () => {
  const html = renderToStaticMarkup(<GtkProvider cssText="label {}">Hello</GtkProvider>);
  const tag = providerTag(html);
  expect(tag).toContain('style="visibility:hidden"');
  expect(tag).toContain('aria-busy="true"');
  expect(tag).not.toContain("data-gtk-ready");
  // Without JavaScript nothing reveals it, so the page shows it from the start.
  expect(html).toContain(
    "<noscript><style>[data-gtk-provider]{visibility:visible!important}</style></noscript>",
  );
});

test("hideUntilReady={false} renders the content ready, with the app's style", () => {
  const html = renderToStaticMarkup(
    <GtkProvider cssText="label {}" hideUntilReady={false} style={{ height: 10 }}>
      Hello
    </GtkProvider>,
  );
  const tag = providerTag(html);
  expect(tag).toContain('data-gtk-ready=""');
  expect(tag).toContain('style="height:10px"');
  expect(tag).not.toContain("aria-busy");
  expect(html).not.toContain("noscript");
});

/** A stand-in for a theme <link> or <style> element. */
function element(localName: string, sheet: object | null = null) {
  return Object.assign(new EventTarget(), { localName, sheet }) as unknown as Element;
}

test("a <style> theme, or none, applies at once", () => {
  for (const theme of [element("style"), null, element("link", {})]) {
    let done = 0;
    whenStylesheetLoaded(theme, () => done++);
    expect(done).toBe(1);
  }
});

test("a <link> theme applies once it loads or fails", () => {
  for (const event of ["load", "error"]) {
    const link = element("link");
    let done = 0;
    whenStylesheetLoaded(link, () => done++, 60_000);
    expect(done).toBe(0);
    link.dispatchEvent(new Event(event));
    link.dispatchEvent(new Event(event));
    expect(done).toBe(1);
  }
});

test("a <link> theme that doesn't load in time is shown anyway", async () => {
  let done = 0;
  whenStylesheetLoaded(element("link"), () => done++, 10);
  expect(done).toBe(0);
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(done).toBe(1);
});

test("cancelling stops waiting for the <link>", async () => {
  const link = element("link");
  let done = 0;
  whenStylesheetLoaded(link, () => done++, 10)();
  link.dispatchEvent(new Event("load"));
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(done).toBe(0);
});
