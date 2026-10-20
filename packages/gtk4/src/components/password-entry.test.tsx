import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkPasswordEntry } from "./password-entry.tsx";

describe("GtkPasswordEntry", () => {
  test("marks a disabled entry insensitive, not only its text", () => {
    const html = renderToStaticMarkup(<GtkPasswordEntry showPeekIcon disabled />);
    expect(html).toMatch(/^<div class="gtk-entry password" data-disabled="true"/);
    expect(html).toMatch(/<input class="gtk-text" type="password" disabled=""/);
  });
});
