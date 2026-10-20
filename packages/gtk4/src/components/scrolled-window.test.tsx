import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { childSizing, GtkScrolledWindow, scrollAxis, scrollBinding } from "./scrolled-window.tsx";
import { GtkTextView } from "./text-view.tsx";

describe("undershoot", () => {
  test("is drawn along each edge the content isn't scrolled to", () => {
    const at = (position: number) => {
      const { start, end } = scrollAxis(position, 300, 100);
      return { start, end };
    };
    expect(at(0)).toEqual({ start: false, end: true });
    expect(at(50)).toEqual({ start: true, end: true });
    expect(at(200)).toEqual({ start: true, end: false });
    // Scrolled to within a fraction of a pixel of the end.
    expect(at(199.6)).toEqual({ start: true, end: false });
  });

  test("is not drawn when the content fits", () => {
    expect(scrollAxis(0, 100, 100)).toMatchObject({ start: false, end: false, overflows: false });
  });

  test("has no nodes before the scrolled window is measured", () => {
    expect(renderToStaticMarkup(<GtkScrolledWindow>Content</GtkScrolledWindow>)).not.toContain(
      "gtk-undershoot",
    );
  });
});

describe("adjustment", () => {
  test("value and page size follow the scroll position", () => {
    expect(scrollAxis(100, 300, 100)).toMatchObject({ value: 0.5, pageSize: 1 / 3 });
    expect(scrollAxis(0, 100, 100)).toMatchObject({ value: 0, pageSize: 1 });
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

describe("indicators", () => {
  test("overlay scrollbars for the policies that may show them, hidden at rest", () => {
    const html = renderToStaticMarkup(<GtkScrolledWindow>Content</GtkScrolledWindow>);
    expect(html).toContain(
      'class="gtk-scrollbar gtk-box-layout horizontal bottom overlay-indicator"',
    );
    expect(html).toContain('class="gtk-scrollbar gtk-box-layout vertical right overlay-indicator"');
    expect(html.match(/opacity:0/g)).toHaveLength(2);
  });

  test("none for the never and external policies", () => {
    const html = renderToStaticMarkup(
      <GtkScrolledWindow hscrollbarPolicy="never" vscrollbarPolicy="external">
        Content
      </GtkScrolledWindow>,
    );
    expect(html).not.toContain("gtk-scrollbar");
  });
});

describe("size", () => {
  test("the child adds to the size only as gtk_scrolled_window_measure() asks", () => {
    expect(childSizing("automatic", false, 120)).toEqual({ size: "0px", min: "100%", max: "none" });
    expect(childSizing("automatic", true, 120)).toEqual({
      size: "auto",
      min: "100%",
      max: "120px",
    });
    expect(childSizing("never", false, 120)).toEqual({
      size: "min-content",
      min: "100%",
      max: "none",
    });
    expect(childSizing("never", true, -1)).toEqual({
      size: "auto",
      min: "min-content",
      max: "none",
    });
  });
});

describe("key bindings", () => {
  test("as gtk_scrolled_window_class_init()", () => {
    const step = (forward: boolean, horizontal: boolean) => ({
      scroll: "step",
      forward,
      horizontal,
    });
    expect(scrollBinding("ArrowDown", true)).toEqual(step(true, false));
    expect(scrollBinding("ArrowLeft", true)).toEqual(step(false, true));
    expect(scrollBinding("ArrowDown", false)).toBeNull();
    expect(scrollBinding(" ", false)).toBeNull();
    expect(scrollBinding("PageDown", false)).toEqual({
      scroll: "page",
      forward: true,
      horizontal: false,
    });
    expect(scrollBinding("PageUp", true)).toEqual({
      scroll: "page",
      forward: false,
      horizontal: true,
    });
    expect(scrollBinding("End", true)).toEqual({ scroll: "end", forward: true, horizontal: true });
    expect(scrollBinding("Home", false)).toEqual({
      scroll: "start",
      forward: false,
      horizontal: false,
    });
  });
});
