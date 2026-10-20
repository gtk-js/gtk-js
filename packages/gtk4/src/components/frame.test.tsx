import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkFrame } from "./frame.tsx";
import { GtkLabel } from "./label.tsx";

describe("GtkFrame", () => {
  test("puts the label right in the frame node, where `frame > label` matches", () => {
    const html = renderToStaticMarkup(
      <GtkFrame label="Title">
        <GtkLabel label="Content" />
      </GtkFrame>,
    );
    expect(html).toMatch(
      /^<div class="gtk-frame"[^>]*><span class="gtk-label" data-expand-ignored="">Title<\/span><span class="gtk-label"[^>]*>Content<\/span><\/div>$/,
    );
  });

  test("marks a label widget as the frame's label", () => {
    const html = renderToStaticMarkup(<GtkFrame labelWidget={<GtkLabel label="Custom" />} />);
    expect(html).toMatch(
      /^<div class="gtk-frame"[^>]*><span class="gtk-label"[^>]*data-expand-ignored=""/,
    );
  });

  test("splits the free width by labelXalign, clamped to [0, 1]", () => {
    const columns = (labelXalign: number) =>
      renderToStaticMarkup(<GtkFrame label="Title" labelXalign={labelXalign} />).match(
        /grid-template-columns:([^;"]*)/,
      )?.[1];
    expect(columns(0.25)).toBe("0.25fr auto 0.75fr");
    expect(columns(2)).toBe("1fr auto 0fr");
  });
});
