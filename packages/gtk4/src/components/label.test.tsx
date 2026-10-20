// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkLabel } from "./label.tsx";

const styleOf = (html: string) => html.match(/class="gtk-label"[^>]*style="([^"]*)"/)?.[1] ?? "";

describe("GtkLabel", () => {
  test("a wrapping, ellipsized label wraps up to `lines` lines", () => {
    const style = styleOf(
      renderToStaticMarkup(<GtkLabel label="text" wrap ellipsize="end" lines={2} />),
    );
    expect(style).toContain("white-space:pre-wrap");
    expect(style).toContain("-webkit-line-clamp:2");
  });

  test("an ellipsized label is one line per paragraph without `lines`", () => {
    const html = renderToStaticMarkup(<GtkLabel label="text" wrap ellipsize="end" />);
    expect(styleOf(html)).toContain("white-space:pre");
    expect(styleOf(html)).not.toContain("line-clamp");
    expect(html).toContain("text-overflow:ellipsis");
  });

  test("`lines` has no effect on a label that doesn't ellipsize", () => {
    const style = styleOf(renderToStaticMarkup(<GtkLabel label="text" wrap lines={2} />));
    expect(style).not.toContain("line-clamp");
  });

  test("a wrapping label is whole pixels tall, unless its style sets a height", () => {
    const style = (props: object) =>
      styleOf(renderToStaticMarkup(<GtkLabel label="text" wrap {...props} />));
    // gtk_label_measure() takes the layout's pixel size.
    expect(style({})).toContain("height:calc-size(auto, round(up, size, 1px))");
    expect(style({ style: { height: 40 } })).toContain("height:40px");
  });

  test("xalign places the text, centered by default like GtkLabel", () => {
    const style = (props: object) =>
      styleOf(renderToStaticMarkup(<GtkLabel label="text" {...props} />));
    expect(style({})).toContain("justify-content:center");
    expect(style({ xalign: 0 })).toContain("justify-content:flex-start");
    expect(style({ xalign: 1 })).toContain("justify-content:flex-end");
  });

  test("yalign other than 0.5 moves the text off the middle", () => {
    const html = (props: object) => renderToStaticMarkup(<GtkLabel label="text" {...props} />);
    expect(styleOf(html({}))).not.toContain("align-items");
    expect(styleOf(html({ yalign: 0 }))).toContain("align-items:flex-start");
  });
});
