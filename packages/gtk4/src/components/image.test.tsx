import { describe, expect, test } from "bun:test";
import { createGtkIcon, createGtkIconFromSvg, createGtkIconFromUrl } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { IconProvider } from "../icon-context.tsx";
import { GtkImage } from "./image.tsx";

const icons = {
  ImageMissing: createGtkIcon("ImageMissing", [["path", { d: "M0 0h16v16H0z" }]]),
  ComExampleApp: createGtkIconFromUrl("ComExampleApp", "app.svg"),
  ComExampleInline: createGtkIconFromSvg(
    "ComExampleInline",
    `<?xml version="1.0" encoding="UTF-8"?>
<svg height="128px" viewBox="0 0 128 128" width="128px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <linearGradient id="a"><stop offset="0" stop-color="#1a5fb4"/></linearGradient>
  <linearGradient id="b" xlink:href="#a"/>
  <path d="M0 0h128v128H0z" fill="url(#b)" style="stroke: url('#a')"/>
</svg>`,
  ),
};

function render(iconName?: string, pixelSize?: number) {
  return renderToStaticMarkup(
    <IconProvider value={icons}>
      <GtkImage iconName={iconName} pixelSize={pixelSize} />
    </IconProvider>,
  );
}

describe("GtkImage", () => {
  test("shows image-missing for a name the icon set doesn't have, like GtkIconTheme", () => {
    expect(render("NoSuchIcon")).toContain("gtk-icon-ImageMissing");
  });

  test("shows nothing without an icon name", () => {
    expect(render()).toBe('<span class="gtk-image"></span>');
  });

  test("draws full-color icons from a URL at the icon size", () => {
    const html = render("ComExampleApp", 32);
    expect(html).toContain('width="32"');
    expect(html).toContain('<image href="app.svg" width="16" height="16"></image>');
  });

  test("draws full-color SVG icons inline, with the page", () => {
    const html = render("ComExampleInline", 32);
    expect(html).toContain('width="32" height="32" viewBox="0 0 128 128"');
    expect(html).toContain('<path d="M0 0h128v128H0z"');
    expect(html).not.toContain("<?xml");
  });

  test("keeps the ids of inline icons apart", () => {
    const html = render("ComExampleInline");
    const prefix = html.match(/id="(gtk-icon-ComExampleInline-[\w-]*-)a"/)?.[1];
    expect(prefix).toBeDefined();
    expect(html).toContain(`xlink:href="#${prefix}a"`);
    expect(html).toContain(`fill="url(#${prefix}b)"`);
    expect(html).toContain(`stroke: url(#${prefix}a)`);
    expect(html).not.toContain('id="a"');
  });

  test("gives each copy of an inline icon its own ids", () => {
    const html = renderToStaticMarkup(
      <IconProvider value={icons}>
        <GtkImage iconName="ComExampleInline" />
        <GtkImage iconName="ComExampleInline" />
      </IconProvider>,
    );
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });
});
