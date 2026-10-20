// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkRevealer } from "./revealer.tsx";

describe("GtkRevealer", () => {
  test("a hidden child stays mounted, out of view, like gtk_widget_set_child_visible()", () => {
    const html = renderToStaticMarkup(
      <GtkRevealer>
        <span>Child</span>
      </GtkRevealer>,
    );
    expect(html).toMatch(
      /^<div class="gtk-revealer gtk-bin-layout" style="[^"]*height:0;overflow:clip;visibility:hidden"><span>Child<\/span><\/div>$/,
    );
  });

  test("a revealed child takes its own height", () => {
    const html = renderToStaticMarkup(
      <GtkRevealer revealChild transitionType="slide-up">
        <span>Child</span>
      </GtkRevealer>,
    );
    expect(html).not.toMatch(/height|visibility/);
  });

  test("slide-down keeps the child's bottom edge in view while it slides", () => {
    const html = renderToStaticMarkup(<GtkRevealer revealChild />);
    expect(html).toContain("align-content:end");
  });
});
