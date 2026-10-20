// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkCenterBox } from "./center-box.tsx";

describe("GtkCenterBox", () => {
  test("the start, center and end widgets are the box's own children, like gtkcenterbox.c", () => {
    const html = renderToStaticMarkup(
      <GtkCenterBox
        startWidget={<span>Start</span>}
        centerWidget={<span>Center</span>}
        endWidget={<span>End</span>}
      />,
    );
    expect(html).toBe(
      '<div class="gtk-box gtk-center-layout" data-start="" data-center="" data-end=""><span>Start</span><span>Center</span><span>End</span></div>',
    );
  });

  test("only a vertical orientation adds its class", () => {
    expect(renderToStaticMarkup(<GtkCenterBox orientation="vertical" />)).toContain(
      'class="gtk-box gtk-center-layout vertical"',
    );
  });

  test("baselinePosition and shrinkCenterLast reach the layout", () => {
    const html = renderToStaticMarkup(
      <GtkCenterBox baselinePosition="bottom" shrinkCenterLast={false} />,
    );
    expect(html).toContain('data-baseline-position="bottom"');
    expect(html).toContain('data-shrink-center-last="false"');
    expect(renderToStaticMarkup(<GtkCenterBox />)).not.toMatch(/baseline|shrink/);
  });
});
