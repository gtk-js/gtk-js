import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkProvider } from "../provider.tsx";
import { DecorationLayout } from "../types.ts";
import { GtkHeaderBar } from "./headerbar.tsx";
import { GtkWindow } from "./window.tsx";
import { windowControlButtons } from "./window-controls.tsx";

describe("decoration layout", () => {
  test("only minimize, maximize and close make buttons", () => {
    expect(windowControlButtons("menu:minimize,maximize,close", "start")).toEqual([]);
    expect(windowControlButtons("icon,appmenu:close", "start")).toEqual([]);
    expect(windowControlButtons("menu:minimize,maximize,close", "end")).toEqual([
      "minimize",
      "maximize",
      "close",
    ]);
  });

  test("without a colon, both sides use the whole layout", () => {
    expect(windowControlButtons("close", "start")).toEqual(["close"]);
    expect(windowControlButtons("close", "end")).toEqual(["close"]);
  });

  test("splits at the first colon only", () => {
    expect(windowControlButtons("close:minimize:maximize", "end")).toEqual([]);
    expect(windowControlButtons(":", "start")).toEqual([]);
  });
});

describe("GtkProvider decorationLayout", () => {
  const controls = (html: string) =>
    [...html.matchAll(/gtk-windowcontrols gtk-box-layout horizontal (start|end)/g)].map(
      (m) => m[1],
    );

  test("puts the window buttons where GtkSettings would, macOS's on the left", () => {
    const html = renderToStaticMarkup(
      <GtkProvider decorationLayout={DecorationLayout.MACOS}>
        <GtkWindow titlebar={<GtkHeaderBar />} />
      </GtkProvider>,
    );
    expect(controls(html)).toEqual(["start"]);
    expect(html.indexOf('aria-label="Close"')).toBeLessThan(html.indexOf('aria-label="Minimize"'));
  });

  test("a header bar's own layout wins", () => {
    const html = renderToStaticMarkup(
      <GtkProvider decorationLayout={DecorationLayout.MACOS}>
        <GtkWindow titlebar={<GtkHeaderBar decorationLayout=":close" />} />
      </GtkProvider>,
    );
    expect(controls(html)).toEqual(["end"]);
  });

  test("defaults to minimize, maximize and close on the right", () => {
    const html = renderToStaticMarkup(
      <GtkProvider>
        <GtkWindow titlebar={<GtkHeaderBar />} />
      </GtkProvider>,
    );
    expect(controls(html)).toEqual(["end"]);
  });
});
