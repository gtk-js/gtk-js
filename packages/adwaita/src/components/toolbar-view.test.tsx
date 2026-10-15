// Unit tests — no Playwright/cargo preload needed.
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
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
