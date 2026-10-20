// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkActionBar } from "./action-bar.tsx";

describe("GtkActionBar", () => {
  test("actionbar > revealer > box > box.start, center widget, box.end, like gtk_action_bar_init()", () => {
    const html = renderToStaticMarkup(
      <GtkActionBar start={<i>A</i>} centerWidget={<b>C</b>} end={<i>E</i>} />,
    );
    expect(html).toBe(
      '<div class="gtk-actionbar"><div class="gtk-revealer gtk-bin-layout">' +
        '<div class="gtk-box gtk-center-layout" data-start="" data-center="" data-end="">' +
        '<div class="gtk-box gtk-box-layout horizontal start"><i>A</i></div><b>C</b>' +
        '<div class="gtk-box gtk-box-layout horizontal end"><i>E</i></div></div></div></div>',
    );
  });

  test("a hidden bar keeps its children mounted, out of view", () => {
    const html = renderToStaticMarkup(<GtkActionBar revealed={false} start={<i>A</i>} />);
    expect(html).toContain("height:0;overflow:clip;visibility:hidden");
    expect(html).toContain("<i>A</i>");
  });
});
