// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwToolbarView } from "./toolbar-view.tsx";

const classOf = (html: string) => html.match(/class="([^"]*)"/)?.[1]?.split(" ");

describe("AdwToolbarView undershoots", () => {
  test("are on for flat bars, like update_undershoots()", () => {
    const classes = classOf(
      renderToStaticMarkup(
        <AdwToolbarView topBars={<div />} bottomBars={<div />} content="Content" />,
      ),
    );
    expect(classes).toContain("undershoot-top");
    expect(classes).toContain("undershoot-bottom");
  });

  test("are off for raised bars, missing bars and content extended under the bars", () => {
    const html = [
      renderToStaticMarkup(
        <AdwToolbarView topBars={<div />} topBarStyle="raised" content="Content" />,
      ),
      renderToStaticMarkup(<AdwToolbarView content="Content" />),
      renderToStaticMarkup(
        <AdwToolbarView topBars={<div />} extendContentToTopEdge content="Content" />,
      ),
      renderToStaticMarkup(
        <AdwToolbarView topBars={<div />} revealTopBars={false} content="Content" />,
      ),
    ];
    for (const markup of html) expect(classOf(markup)).not.toContain("undershoot-top");
  });
});

describe("AdwToolbarView bars", () => {
  test("hidden bars stay mounted, out of view, like a revealer's child", () => {
    const html = renderToStaticMarkup(
      <AdwToolbarView topBars={<input />} revealTopBars={false} content="Content" />,
    );
    expect(html).toMatch(/class="gtk-revealer gtk-bin-layout top-bar"[^>]*visibility:hidden/);
    expect(html).toContain("<input/>");
  });

  test("content extended to an edge spans the bar's row, and is painted under the bars", () => {
    const html = renderToStaticMarkup(
      <AdwToolbarView topBars={<div />} extendContentToTopEdge content="Content" />,
    );
    expect(html).toContain("grid-row:1 / 3;grid-column:1;order:-1");
  });
});
