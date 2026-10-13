import { describe, expect, test } from "bun:test";
import { createGtkIcon, createGtkIconFromUrl } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { IconProvider } from "../icon-context.tsx";
import { GtkImage } from "./image.tsx";

const icons = {
  ImageMissing: createGtkIcon("ImageMissing", [["path", { d: "M0 0h16v16H0z" }]]),
  ComExampleApp: createGtkIconFromUrl("ComExampleApp", "app.svg"),
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
});
