// Unit tests — no Playwright/cargo preload needed.
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GtkWindowTitle } from "./window-title.tsx";

describe("GtkWindowTitle", () => {
  test("is laid out by its layout class, keeping a caller's style", () => {
    const html = renderToStaticMarkup(
      <GtkWindowTitle title="Title" subtitle="Subtitle" style={{ color: "red" }} />,
    );
    expect(html).toContain('<div class="gtk-windowtitle" style="color:red">');
    expect(html).toContain('<span class="gtk-label title">Title</span>');
    expect(html).toContain('<span class="gtk-label subtitle">Subtitle</span>');
  });
});
