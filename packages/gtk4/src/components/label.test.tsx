// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vite-plus/test";
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

  test("ellipsize start clips the text on the left, keeping its direction", () => {
    const html = renderToStaticMarkup(<GtkLabel label="text" ellipsize="start" />);
    expect(html).toMatch(
      /direction:rtl[^"]*"><span style="direction:ltr;unicode-bidi:isolate">text</,
    );
    expect(html).toContain("text-overflow:ellipsis");
  });

  test("ellipsize middle keeps both ends of the text", () => {
    const html = renderToStaticMarkup(<GtkLabel label="abcdef" ellipsize="middle" />);
    expect(html).toMatch(/text-overflow:ellipsis[^"]*">abc</);
    expect(html).toMatch(
      /direction:rtl[^"]*"><span style="direction:ltr;unicode-bidi:isolate">def</,
    );
  });

  test("maxWidthChars sets the natural width, not a cap on the allocation", () => {
    const html = renderToStaticMarkup(<GtkLabel label="text" wrap maxWidthChars={10} />);
    expect(styleOf(html)).toContain("--gtk-max-width-chars:10ch");
    expect(styleOf(html)).not.toMatch(/(^|;)max-width/);
    expect(html).toContain("min-width:100%;max-width:var(--gtk-max-width-chars)");
    // A wrapping label's width also follows from its height (layout.css).
    expect(styleOf(html)).toContain("--gtk-label-width-for-height:calc-size(");
    const ellipsized = renderToStaticMarkup(
      <GtkLabel label="t" ellipsize="end" maxWidthChars={10} />,
    );
    expect(styleOf(ellipsized)).not.toContain("--gtk-label-width-for-height");
  });

  test("a selectable label takes the focus and shows the text cursor", () => {
    const html = renderToStaticMarkup(<GtkLabel label="text" selectable />);
    expect(html).toContain('tabindex="0"');
    expect(styleOf(html)).toContain("cursor:text");
    expect(styleOf(html)).toContain("user-select:text");
    const plain = renderToStaticMarkup(<GtkLabel label="text" />);
    expect(plain).not.toContain("tabindex");
    expect(styleOf(plain)).not.toContain("cursor");
  });

  test("an insensitive label is :disabled, and a selectable one can't be focused or selected", () => {
    const html = renderToStaticMarkup(<GtkLabel label="text" selectable disabled />);
    expect(html).toContain('data-disabled="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("tabindex");
    expect(styleOf(html)).toContain("user-select:none");
    expect(styleOf(html)).not.toContain("cursor");
  });

  test("useMarkup renders Pango markup, and links as link nodes", () => {
    const html = renderToStaticMarkup(
      <GtkLabel
        label={
          'Visit <b><a href="https://gnome.org?a=1&amp;b=2" title="Site" class="x">GNOME</a> now</b>'
        }
        useMarkup
      />,
    );
    expect(html).toContain('class="gtk-label link"');
    expect(html).toContain(
      '<a class="gtk-link x" href="https://gnome.org?a=1&amp;b=2" target="_blank" rel="noopener noreferrer" data-gtk-tooltip="Site" aria-description="Site" style="cursor:pointer"><span><span style="font-weight:bold">GNOME</span></span></a>',
    );
    expect(html).toContain('<span style="font-weight:bold"> now</span>');
    expect(renderToStaticMarkup(<GtkLabel label="<b>bold</b>" />)).toContain("&lt;b&gt;");
  });

  test("an insensitive label's links take no input", () => {
    const html = renderToStaticMarkup(
      <GtkLabel label={'<a href="https://gnome.org">GNOME</a>'} useMarkup disabled />,
    );
    expect(html).toContain('<a class="gtk-link" target="_blank"');
    expect(html).not.toContain("href=");
    expect(html).toContain('data-disabled="true"><span>GNOME</span></a>');
  });

  test("invalid markup shows nothing, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const label of [
      "<a>no href</a>",
      '<a href="x" id="y">z</a>',
      "<b>open",
      "<a href='x'>z",
    ]) {
      expect(renderToStaticMarkup(<GtkLabel label={label} useMarkup />)).toBe(
        '<span class="gtk-label" style="text-align:start;user-select:none;justify-content:center;white-space:pre"></span>',
      );
    }
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });

  test("an ellipsizing label's minimum is the ellipsis or width-chars, its natural width the text", () => {
    const style = (props: object) =>
      styleOf(renderToStaticMarkup(<GtkLabel label="text" ellipsize="end" {...props} />));
    expect(style({})).toContain("grid-template-columns:minmax(1em, max-content)");
    expect(style({ widthChars: 5 })).toContain("minmax(max(1em, 5ch), max-content)");
  });
});
