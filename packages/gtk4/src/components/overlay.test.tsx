// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkLabel } from "./label.tsx";
import { GtkOverlay } from "./overlay.tsx";

describe("GtkOverlay", () => {
  test("keeps each child's alignment on the child, for layout.css to place it", () => {
    const html = renderToStaticMarkup(
      <GtkOverlay
        child={<GtkLabel label="Main" />}
        overlays={[<GtkLabel key="badge" label="Badge" halign="end" valign="end" />]}
      />,
    );
    expect(html).toMatch(
      /^<div class="gtk-overlay"><div class="gtk-overlay-child"><span class="gtk-label"/,
    );
    // Only the main child counts for the overlay's expand.
    expect(html).toMatch(
      /<div class="gtk-overlay-child" data-expand-ignored=""><span class="gtk-label" data-halign="end" data-valign="end"/,
    );
  });
});
