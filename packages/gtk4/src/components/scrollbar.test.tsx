import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { coordToValue, GtkScrollbar, sliderGeometry, wheelValue } from "./scrollbar.tsx";

describe("slider", () => {
  test("is the visible fraction of the trough, at least its minimum", () => {
    // gtk_range_compute_slider_position(): 30% of 132px is under the minimum.
    expect(sliderGeometry(0.3, 0.3, 132, 40)).toEqual({ position: 27, length: 40 });
    expect(sliderGeometry(0.5, 0.5, 200, 40)).toEqual({ position: 50, length: 100 });
  });

  test("stays in the trough when the page is shorter than its minimum", () => {
    expect(sliderGeometry(1, 0.05, 132, 40)).toEqual({ position: 92, length: 40 });
  });

  test("fills the trough when everything is visible", () => {
    expect(sliderGeometry(0, 1, 132, 40)).toEqual({ position: 0, length: 132 });
  });
});

describe("pointer", () => {
  test("maps the slider's start to a value like coord_to_value()", () => {
    expect(coordToValue(0, 132, 40)).toBe(0);
    expect(coordToValue(46, 132, 40)).toBe(0.5);
    expect(coordToValue(100, 132, 40)).toBe(1);
    expect(coordToValue(-5, 132, 40)).toBe(0);
  });
});

describe("wheel", () => {
  test("moves by a page increment per detent", () => {
    // 90% of a half page, in a range of half a page.
    expect(wheelValue(0, 0.5, 100, 0)).toBeCloseTo(0.9);
    expect(wheelValue(0.5, 0.2, -3, 1)).toBeCloseTo(0.275);
    expect(wheelValue(0.9, 0.5, 100, 0)).toBe(1);
  });
});

describe("node", () => {
  test("is a horizontal scrollbar by default, with its value", () => {
    const html = renderToStaticMarkup(<GtkScrollbar value={0.25} />);
    expect(html).toContain('class="gtk-scrollbar gtk-box-layout horizontal"');
    expect(html).toContain('role="scrollbar"');
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('aria-valuenow="0.25"');
  });

  test("an insensitive scrollbar marks every node, so the theme hides the slider", () => {
    const html = renderToStaticMarkup(<GtkScrollbar disabled />);
    expect(html.match(/data-disabled="true"/g)).toHaveLength(4);
    expect(html).toContain('aria-disabled="true"');
  });
});
