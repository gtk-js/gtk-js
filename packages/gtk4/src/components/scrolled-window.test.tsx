import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GtkScrolledWindow, undershootEdges } from "./scrolled-window.tsx";
import { GtkTextView } from "./text-view.tsx";

describe("undershoot", () => {
  test("is drawn along each edge the content isn't scrolled to", () => {
    const at = (scrollTop: number) =>
      undershootEdges({ scrollTop, scrollHeight: 300, clientHeight: 100 });
    expect(at(0)).toEqual({ top: false, bottom: true });
    expect(at(50)).toEqual({ top: true, bottom: true });
    expect(at(200)).toEqual({ top: true, bottom: false });
    // Scrolled to within a fraction of a pixel of the end.
    expect(at(199.6)).toEqual({ top: true, bottom: false });
  });

  test("is not drawn when the content fits", () => {
    expect(undershootEdges({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })).toEqual({
      top: false,
      bottom: false,
    });
  });

  test("has no nodes before the scrolled window is measured", () => {
    expect(renderToStaticMarkup(<GtkScrolledWindow>Content</GtkScrolledWindow>)).not.toContain(
      "gtk-undershoot",
    );
  });
});

describe("viewport", () => {
  test("a child that doesn't scroll itself is put in a viewport", () => {
    expect(
      renderToStaticMarkup(
        <GtkScrolledWindow>
          <div className="content" />
        </GtkScrolledWindow>,
      ),
    ).toContain('<div class="gtk-viewport gtk-bin-layout"><div class="content"></div></div>');
  });

  test("a viewport or a text view is the scrolled window's own child", () => {
    const viewport = renderToStaticMarkup(
      <GtkScrolledWindow>
        <div className="gtk-viewport" />
      </GtkScrolledWindow>,
    );
    expect(viewport.match(/gtk-viewport/g)).toHaveLength(1);
    const text = renderToStaticMarkup(
      <GtkScrolledWindow>
        <GtkTextView value="" />
      </GtkScrolledWindow>,
    );
    expect(text).not.toContain("gtk-viewport");
  });
});
