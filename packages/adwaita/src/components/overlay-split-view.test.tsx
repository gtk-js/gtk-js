// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { AdwOverlaySplitView, type AdwOverlaySplitViewProps } from "./overlay-split-view.tsx";

interface Node {
  tag: string;
  attrs: string;
}

/** The view's child nodes, in order. */
function children(props: AdwOverlaySplitViewProps): Node[] {
  const html = renderToStaticMarkup(
    <AdwOverlaySplitView
      sidebar={<span data-child="sidebar" />}
      content={<span data-child="content" />}
      {...props}
    />,
  );
  // Each child is a <div> directly inside the root; the panes wrap a <span>.
  const inner = html.slice(html.indexOf(">") + 1, html.lastIndexOf("</div>"));
  return [...inner.matchAll(/<div([^>]*)>/g)].map((m) => ({ tag: "div", attrs: m[1]! }));
}

const cls = (node: Node) => /class="([^"]*)"/.exec(node.attrs)?.[1]?.split(" ") ?? [];
const hidden = (node: Node) => /display:\s*none/.test(node.attrs);
const inert = (node: Node) => /\binert=""/.test(node.attrs);

test("mirrors the node tree: dimming, shadow, border, content, shield, sidebar", () => {
  const nodes = children({});
  expect(nodes.map((n) => cls(n)[0])).toEqual([
    "gtk-dimming",
    "gtk-shadow",
    "gtk-border",
    "gtk-widget",
    "gtk-widget",
    "gtk-widget",
  ]);
});

test("not collapsed: .content-pane and .sidebar-pane, no overlay", () => {
  const [dimming, shadow, , content, shield, sidebar] = children({});
  expect(cls(content!)).toContain("content-pane");
  expect(cls(sidebar!)).toContain("sidebar-pane");
  expect(cls(sidebar!)).not.toContain("background");
  for (const node of [dimming!, shadow!, shield!]) expect(hidden(node)).toBe(true);
  expect(inert(content!)).toBe(false);
  expect(inert(sidebar!)).toBe(false);
});

test("collapsing hides the sidebar unless it's pinned or shown explicitly", () => {
  // update_collapsed(): neither pane class; the sidebar gets .background.
  const [dimming, , , content, , sidebar] = children({ collapsed: true });
  expect(cls(content!)).not.toContain("content-pane");
  expect(cls(sidebar!)).toEqual(expect.arrayContaining(["background"]));
  expect(cls(sidebar!)).not.toContain("sidebar-pane");
  expect(inert(sidebar!)).toBe(true);
  expect(hidden(dimming!)).toBe(true);
  expect(inert(content!)).toBe(false);

  expect(inert(children({ collapsed: true, pinSidebar: true })[5]!)).toBe(false);
});

test("collapsed and shown: the content is dimmed and can't take the focus", () => {
  const [dimming, shadow, border, content, shield, sidebar] = children({
    collapsed: true,
    showSidebar: true,
  });
  for (const node of [dimming!, shadow!, border!, shield!]) expect(hidden(node)).toBe(false);
  expect(cls(dimming!)).toEqual(["gtk-dimming", "left"]);
  expect(cls(shadow!)).toEqual(["gtk-shadow", "left"]);
  expect(inert(content!)).toBe(true);
  expect(inert(sidebar!)).toBe(false);
});

test("showSidebar={false} hides the sidebar when not collapsed too", () => {
  const sidebar = children({ showSidebar: false })[5]!;
  expect(inert(sidebar)).toBe(true);
  expect(sidebar.attrs).toMatch(/visibility:\s*hidden/);
});

test("an end sidebar has .end, and its shadow is on its left", () => {
  const nodes = children({ sidebarPosition: "end", collapsed: true, showSidebar: true });
  expect(cls(nodes[5]!)).toContain("end");
  expect(cls(nodes[0]!)).toEqual(["gtk-dimming", "right"]);
});

test("sidebar widths are in px, pt or sp", () => {
  const style = (props: AdwOverlaySplitViewProps) => children(props)[5]!.attrs;
  expect(style({})).toContain("clamp(180px, round(down, 25%, 1px), 280px)");
  expect(style({ sidebarWidthUnit: "pt" })).toContain("clamp(240px, round(down, 25%, 1px), 374px)");
  expect(style({ collapsed: true, showSidebar: true })).toContain("clamp(180px, 100%, 280px)");
});
