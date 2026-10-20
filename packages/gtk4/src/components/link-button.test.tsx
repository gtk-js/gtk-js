// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkLinkButton } from "./link-button.tsx";

describe("GtkLinkButton", () => {
  test("an insensitive link can't be focused or followed", () => {
    const html = renderToStaticMarkup(<GtkLinkButton uri="https://gtk.org" disabled />);
    expect(html).toContain("data-disabled");
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("href=");
  });

  test("the tooltip shows the URI when the label is another text", () => {
    const tooltip = (props: { label?: string; tooltipText?: string }) =>
      renderToStaticMarkup(<GtkLinkButton uri="https://gtk.org" {...props} />).match(
        /data-gtk-tooltip="([^"]*)"/,
      )?.[1];
    expect(tooltip({ label: "GTK" })).toBe("https://gtk.org");
    expect(tooltip({})).toBeUndefined();
    expect(tooltip({ label: "" })).toBeUndefined();
    expect(tooltip({ label: "GTK", tooltipText: "Website" })).toBe("Website");
  });

  test("the label doesn't wrap", () => {
    const html = renderToStaticMarkup(<GtkLinkButton uri="https://gtk.org" label="A long label" />);
    expect(html).toMatch(/<span class="gtk-label"[^>]*white-space:pre[;"]/);
  });
});
