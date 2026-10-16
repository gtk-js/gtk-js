// Unit tests — no Playwright/cargo preload needed.

import { GtkHeaderBar } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwHeaderBar } from "./header-bar.tsx";

describe("header bar window controls", () => {
  // Both bind the controls' visibility to their "empty" property, so a side
  // without buttons takes no space (or spacing) in its box.
  test("AdwHeaderBar leaves out an empty side", () => {
    const html = renderToStaticMarkup(<AdwHeaderBar decorationLayout=":close" />);
    expect(html).not.toContain("gtk-windowcontrols start");
    expect(html).toContain("gtk-windowcontrols gtk-box-layout horizontal end");
  });

  test("GtkHeaderBar leaves out an empty side", () => {
    const html = renderToStaticMarkup(<GtkHeaderBar decorationLayout="close:" />);
    expect(html).toContain("gtk-windowcontrols gtk-box-layout horizontal start");
    expect(html).not.toContain("gtk-windowcontrols end");
  });
});
