// Unit tests — no Playwright/cargo preload needed.

import { GtkButton, GtkToggleButton, IconProvider } from "@gtk-js/gtk4";
import { createGtkIcon } from "@gtk-js/icon-helpers";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwButtonContent } from "./button-content.tsx";

const Icon = createGtkIcon("Icon", [["path", { d: "M0 0h16v16H0z" }]]);

function render(node: ReactNode) {
  return renderToStaticMarkup(<IconProvider value={{ MissingIcon: Icon }}>{node}</IconProvider>);
}

const buttonClasses = (html: string) => html.match(/<button[^>]*class="([^"]*)"/)?.[1]?.split(" ");

describe("AdwButtonContent", () => {
  test("makes the button it's in .image-text-button (adw_button_content_root())", () => {
    const content = <AdwButtonContent iconName="DocumentOpen" label="Open" />;
    expect(buttonClasses(render(<GtkButton>{content}</GtkButton>))).toContain("image-text-button");
    expect(buttonClasses(render(<GtkToggleButton>{content}</GtkToggleButton>))).toContain(
      "image-text-button",
    );
  });

  test("centers its box, and leaves the label's weight to the theme", () => {
    const html = render(<AdwButtonContent iconName="DocumentOpen" label="Open" />);
    expect(html).toContain('class="gtk-box gtk-box-layout horizontal" data-halign="center"');
    expect(html).not.toContain("font-weight");
  });

  test("canShrink ellipsizes the label", () => {
    expect(render(<AdwButtonContent label="Open" canShrink />)).toContain("text-overflow:ellipsis");
    expect(render(<AdwButtonContent label="Open" />)).not.toContain("text-overflow");
  });

  test("useUnderline hides the mnemonic underscore", () => {
    expect(render(<AdwButtonContent label="_Open" useUnderline />)).toContain(">Open<");
  });

  test("an empty or unknown icon name shows image-missing", () => {
    expect(render(<AdwButtonContent label="Open" />)).toMatch(/class="gtk-image"[^>]*><svg/);
    expect(render(<AdwButtonContent iconName="NoSuchIcon" />)).toMatch(
      /class="gtk-image"[^>]*><svg/,
    );
  });
});
