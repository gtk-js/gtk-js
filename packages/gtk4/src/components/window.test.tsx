import { createGtkIcon } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { IconProvider } from "../icon-context.tsx";
import { GtkHeaderBar } from "./headerbar.tsx";
import { GtkWindow, type GtkWindowProps } from "./window.tsx";

const icons = Object.fromEntries(
  ["WindowClose", "WindowMaximize", "WindowMinimize", "WindowRestore"].map((name) => [
    name,
    createGtkIcon(name, [["path", { d: "M0 0h16v16H0z" }]]),
  ]),
);

function render(props: GtkWindowProps) {
  return renderToStaticMarkup(
    <IconProvider value={icons}>
      <GtkWindow titlebar={<GtkHeaderBar />} {...props} />
    </IconProvider>,
  );
}

describe("GtkWindow draggableRegions", () => {
  test("marks the window so its handles become app regions", () => {
    expect(renderToStaticMarkup(<GtkWindow draggableRegions />)).toContain(
      'data-draggable-regions=""',
    );
    expect(renderToStaticMarkup(<GtkWindow />)).not.toContain("data-draggable-regions");
  });
});

describe("GtkWindow title", () => {
  test("a header bar without a title widget shows it, and it isn't a tooltip", () => {
    const html = render({ title: "My App" });
    expect(html).toMatch(/<span class="gtk-label title"[^>]*><span[^>]*>My App<\/span>/);
    expect(html).not.toContain('title="My App"');
  });
});

describe("GtkWindow maximized", () => {
  test("the maximize button shows window-restore", () => {
    const maximize = (html: string) => html.match(/image-button maximize"[\s\S]*?<\/button>/)?.[0];
    expect(maximize(render({ maximized: true }))).toContain("gtk-icon-WindowRestore");
    expect(maximize(render({}))).toContain("gtk-icon-WindowMaximize");
  });
});

describe("GtkWindow child", () => {
  test("gets the whole content area, in a bin layout, not a box", () => {
    const html = render({ children: <span>Content</span> });
    expect(html).toContain('<div class="gtk-bin-layout" style="flex:1;min-height:0"><span>Content');
    expect(html).not.toContain("gtk-box-layout vertical");
  });
});

describe("GtkWindow resize handles", () => {
  const handles = (html: string) => html.match(/cursor:[a-z]+-resize/g) ?? [];

  test("lie in the shadow allocation, before (under) the window", () => {
    const html = render({ allocateShadow: true, onResize: () => {} });
    expect(handles(html)).toHaveLength(8);
    expect(html.lastIndexOf("-resize")).toBeLessThan(html.indexOf("gtk-window background"));
  });

  test("are left out when maximized, fullscreen or tiled", () => {
    for (const state of ["maximized", "fullscreen", "tiled"] as const) {
      const html = render({ allocateShadow: true, onResize: () => {}, [state]: true });
      expect(html).toContain(`gtk-window background csd ${state}`);
      expect(handles(html)).toEqual([]);
    }
  });
});
