// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkProgressBar } from "./progress-bar.tsx";

describe("GtkProgressBar text", () => {
  test("is a label named text, before the trough", () => {
    const html = renderToStaticMarkup(
      <GtkProgressBar fraction={0.3} showText text="4 of 6 items" />,
    );
    expect(html).toMatch(/<span class="gtk-text"[^>]*>4 of 6 items<\/span><div class="gtk-trough/);
    expect(html).toContain('aria-valuetext="4 of 6 items"');
  });

  test("shows the percentage without a text of its own", () => {
    const html = renderToStaticMarkup(<GtkProgressBar fraction={0.3} showText />);
    expect(html).toContain(">30 %</span>");
  });

  test("isn't shown without showText", () => {
    const html = renderToStaticMarkup(<GtkProgressBar fraction={0.3} text="4 of 6 items" />);
    expect(html).not.toContain("gtk-text");
  });
});
