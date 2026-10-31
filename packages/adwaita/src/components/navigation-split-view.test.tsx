// Unit tests — no Playwright/cargo preload needed.

import { IconProvider, WindowControlsContext } from "@gtk-js/gtk4";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwHeaderBar } from "./header-bar.tsx";
import {
  AdwNavigationSplitView,
  type AdwNavigationSplitViewProps,
} from "./navigation-split-view.tsx";
import { AdwNavigationView } from "./navigation-view.tsx";

const icons = { GoPrevious: () => <svg /> };
const LAYOUT = "close:close";

const page = (tag: string, child: ReactNode = <AdwHeaderBar decorationLayout={LAYOUT} />) => ({
  tag,
  title: tag,
  children: <section data-page={tag}>{child}</section>,
});

function render(node: ReactNode): string {
  return renderToStaticMarkup(<IconProvider value={icons as never}>{node}</IconProvider>);
}

/** Each page's header bar: its title buttons and whether it has a back button. */
function headerBars(html: string): Record<string, string> {
  const sections = html.split("<section").slice(1);
  return Object.fromEntries(
    sections.map((s) => {
      const tag = /data-page="([^"]+)"/.exec(s)![1];
      const start = s.includes("gtk-windowcontrols gtk-box-layout horizontal start");
      const end = s.includes("gtk-windowcontrols gtk-box-layout horizontal end");
      const back = s.includes("image-button back");
      return [tag, [back && "back", start && "start", end && "end"].filter(Boolean).join(" ")];
    }),
  );
}

function split(props: Partial<AdwNavigationSplitViewProps> = {}) {
  return <AdwNavigationSplitView sidebar={page("sidebar")} content={page("content")} {...props} />;
}

describe("AdwNavigationSplitView", () => {
  test("uncollapsed, the panes are bins holding the pages, as in GTK's node tree", () => {
    const html = render(split());
    expect(html).toMatch(
      /^<div class="gtk-navigation-split-view" [^>]*><div style="display:contents"><div class="gtk-widget sidebar-pane gtk-bin-layout" [^>]*><div class="gtk-navigation-view-page gtk-bin-layout"/,
    );
    expect(html).toContain('class="gtk-widget content-pane gtk-bin-layout"');
    expect(html).not.toContain("collapsed");
    expect(render(split({ sidebarPosition: "end" }))).toContain(
      'class="gtk-widget sidebar-pane gtk-bin-layout end"',
    );
  });

  test("at rest, its pages aren't stacking contexts, so their popovers rise above the other pane", () => {
    // A page's z-index orders it against a transition's dimming and shadow;
    // at rest it would trap the popovers in it (GTK draws them on their own
    // surfaces), e.g. a sidebar menu overhanging the content pane.
    for (const html of [render(split()), render(split({ collapsed: true }))]) {
      const pages = html.match(/class="gtk-navigation-view-page[^"]*" [^>]*style="[^"]*"/g) ?? [];
      expect(pages.length).toBeGreaterThan(0);
      for (const page of pages) expect(page).not.toContain("z-index");
    }
  });

  test("collapsed, the pages are in a navigation view", () => {
    const html = render(split({ collapsed: true }));
    expect(html).toMatch(
      /^<div class="gtk-navigation-split-view gtk-bin-layout" [^>]*><div class="gtk-navigation-view gtk-bin-layout"/,
    );
    expect(html).not.toContain("-pane");
  });

  test("the sidebar width is rounded down and clamped like allocate_uncollapsed()", () => {
    expect(render(split())).toContain(
      "grid-template-columns:minmax(min-content, clamp(180px, round(down, 25%, 1px), 280px)) minmax(min-content, 1fr)",
    );
    expect(render(split({ minSidebarWidth: 150, sidebarWidthUnit: "pt" }))).toContain(
      "clamp(200px, round(down, 25%, 1px), 374px)",
    );
  });

  test("uncollapsed, header bars hide the title buttons facing the other pane", () => {
    expect(headerBars(render(split()))).toEqual({ sidebar: "start", content: "end" });
    expect(headerBars(render(split({ sidebarPosition: "end" })))).toEqual({
      sidebar: "end",
      content: "start",
    });
    // Collapsed, each page is the whole view.
    expect(headerBars(render(split({ collapsed: true })))).toEqual({
      sidebar: "start end",
      content: "back start end",
    });
  });

  test("nested split views add up, and a dialog's header bar ignores them", () => {
    const inner = (
      <AdwNavigationSplitView
        sidebar={page("inner-sidebar")}
        content={page(
          "inner-content",
          <WindowControlsContext.Provider value={{}}>
            <AdwHeaderBar decorationLayout={LAYOUT} />
          </WindowControlsContext.Provider>,
        )}
      />
    );
    const html = render(
      <AdwNavigationSplitView sidebar={page("sidebar")} content={page("content", inner)} />,
    );
    expect(headerBars(html)).toEqual({
      sidebar: "start",
      content: "",
      "inner-sidebar": "",
      "inner-content": "start end",
    });
  });

  test("uncollapsed, the panes show the back button of an enclosing view", () => {
    const html = render(
      <AdwNavigationView
        stack={["outer", "split"]}
        pages={[page("outer"), { tag: "split", title: "Split", children: split() }]}
      />,
    );
    expect(headerBars(html)).toEqual({
      outer: "start end",
      sidebar: "back start",
      content: "back end",
    });
  });

  test("collapsed, the page shown follows showContent, the root page has the enclosing view's back button", () => {
    const html = render(split({ collapsed: true, showContent: true }));
    expect(html).toMatch(/aria-hidden="true" inert=""[^>]*><section data-page="sidebar"/);
    expect(html).not.toMatch(/inert=""[^>]*><section data-page="content"/);
    const end = render(split({ collapsed: true, sidebarPosition: "end" }));
    // With the sidebar at the end, the content is the root page.
    expect(headerBars(end)).toEqual({ sidebar: "back start end", content: "start end" });
    expect(end).toMatch(/inert=""[^>]*><section data-page="content"/);
  });
});
