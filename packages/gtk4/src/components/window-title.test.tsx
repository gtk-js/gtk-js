// Unit tests — no Playwright/cargo preload needed.
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GtkWindowTitle } from "./window-title.tsx";

describe("GtkWindowTitle", () => {
  test("a caller's style merges with the title's grid layout", () => {
    const html = renderToStaticMarkup(<GtkWindowTitle title="Title" style={{ color: "red" }} />);
    const style = html.match(/class="gtk-windowtitle"[^>]*style="([^"]*)"/)?.[1] ?? "";
    expect(style).toContain("display:grid");
    expect(style).toContain("grid-template-columns:minmax(calc(5ch + 24px), max-content)");
    expect(style).toContain("color:red");
  });
});
