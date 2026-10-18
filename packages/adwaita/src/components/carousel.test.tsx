// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwCarousel, AdwCarouselIndicatorDots, AdwCarouselIndicatorLines } from "./carousel.tsx";

/** The attributes of the circles or rects an indicator draws, numbers parsed. */
function shapes(html: string): Record<string, string | number>[] {
  return [...html.matchAll(/<(?:circle|rect) ([^>]*?)\/?>/g)].map(([, attributes]) =>
    Object.fromEntries(
      [...attributes!.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name!,
        /^-?[\d.]+$/.test(value!) ? Number(value) : value!,
      ]),
    ),
  );
}

const round = (n: string | number | undefined) => Math.round((n as number) * 100) / 100;

describe("AdwCarousel", () => {
  test("null and false children aren't pages, like adw_carousel_append()", () => {
    const html = renderToStaticMarkup(
      <AdwCarousel>
        <span>A</span>
        {false}
        {null}
        <span>B</span>
      </AdwCarousel>,
    );
    expect(html.match(/--gtk-carousel-index:\d+/g)).toEqual([
      "--gtk-carousel-index:0",
      "--gtk-carousel-index:1",
    ]);
  });

  test("`page` is the page it shows, within the pages it has", () => {
    const pages = [<span key="a" />, <span key="b" />, <span key="c" />];
    expect(renderToStaticMarkup(<AdwCarousel>{pages}</AdwCarousel>)).toContain(
      "--gtk-carousel-position:0;",
    );
    expect(renderToStaticMarkup(<AdwCarousel page={2}>{pages}</AdwCarousel>)).toContain(
      "--gtk-carousel-position:2;",
    );
    expect(renderToStaticMarkup(<AdwCarousel page={7}>{pages}</AdwCarousel>)).toContain(
      "--gtk-carousel-position:2;",
    );
  });
});

describe("AdwCarouselIndicatorDots", () => {
  // At its natural size, 3 × 15 + 12 by 20, as snapshot_dots() draws them:
  // dots 15px apart from 9px in (the pixel-grid rule), centered across.
  test("dots keep their places and grow with the position, like snapshot_dots()", () => {
    const at = (position: number) =>
      shapes(renderToStaticMarkup(<AdwCarouselIndicatorDots nPages={3} position={position} />)).map(
        (dot) => ({ x: dot.cx, y: dot.cy, radius: round(dot.r), opacity: round(dot.opacity) }),
      );
    expect(at(0)).toEqual([
      { x: 16.5, y: 10, radius: 4, opacity: 0.9 },
      { x: 31.5, y: 10, radius: 3, opacity: 0.3 },
      { x: 46.5, y: 10, radius: 3, opacity: 0.3 },
    ]);
    expect(at(1).map((dot) => dot.x)).toEqual([16.5, 31.5, 46.5]);
    const halfway = at(0.5);
    expect(halfway.map((dot) => dot.radius)).toEqual([3.5, 3.5, 3]);
    expect(halfway.map((dot) => dot.opacity)).toEqual([0.6, 0.6, 0.3]);
  });

  test("it has its natural size, along its orientation", () => {
    expect(renderToStaticMarkup(<AdwCarouselIndicatorDots nPages={3} position={0} />)).toContain(
      'class="gtk-carouselindicatordots" style="position:relative;min-width:57px;min-height:20px"',
    );
    expect(
      renderToStaticMarkup(
        <AdwCarouselIndicatorDots nPages={3} position={0} orientation="vertical" />,
      ),
    ).toContain("position:relative;min-height:57px;min-width:20px");
  });

  test("it draws nothing for fewer than two pages", () => {
    expect(renderToStaticMarkup(<AdwCarouselIndicatorDots nPages={1} position={0} />)).toBe(
      '<div class="gtk-carouselindicatordots" style="position:relative;min-width:27px;min-height:20px"></div>',
    );
  });
});

describe("AdwCarouselIndicatorLines", () => {
  // At its natural size, 3 × 40 + 4 by 7: 35 × 3 lines 40px apart from 4px in.
  test("square lines, and the active one over them at the position", () => {
    const lines = shapes(
      renderToStaticMarkup(<AdwCarouselIndicatorLines nPages={3} position={0.5} />),
    );
    expect(lines.map((l) => [l.x, l.y, l.width, l.height, round(l.opacity)])).toEqual([
      [4, 2, 35, 3, 0.3],
      [44, 2, 35, 3, 0.3],
      [84, 2, 35, 3, 0.3],
      [24, 2, 35, 3, 0.9],
    ]);
    expect(lines.some((line) => "rx" in line)).toBe(false);
  });

  test("it draws nothing for fewer than two pages", () => {
    const html = renderToStaticMarkup(<AdwCarouselIndicatorLines nPages={1} position={0} />);
    expect(html).toBe(
      '<div class="gtk-carouselindicatorlines" style="position:relative;min-width:44px;min-height:7px"></div>',
    );
  });
});
