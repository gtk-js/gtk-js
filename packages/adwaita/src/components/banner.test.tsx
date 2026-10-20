// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwBanner, bannerLayout } from "./banner.tsx";

describe("AdwBanner nodes", () => {
  test("the gizmo is the `widget` node the theme pads and colors (banner > revealer > widget)", () => {
    const html = renderToStaticMarkup(<AdwBanner title="You are offline" revealed />);
    expect(html).toMatch(
      /^<div class="gtk-banner[^"]*"[^>]*><div class="gtk-revealer"><div class="gtk-widget"><span[^>]* class="gtk-label heading"/,
    );
  });

  test("is a group labelled by its title, like adw-banner.ui", () => {
    const html = renderToStaticMarkup(<AdwBanner title="You are offline" revealed />);
    const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(html).toContain('role="group"');
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
  });

  test("the button is a text button whose label uses underlines for mnemonics", () => {
    const html = renderToStaticMarkup(
      <AdwBanner title="Metered connection" buttonLabel="_Network Settings" revealed />,
    );
    expect(html).toContain(
      '<button class="gtk-button text-button" data-valign="center" type="button">',
    );
    expect(html).not.toContain("_Network");
    expect(html).toMatch(/>N<\/span>etwork Settings</);
  });

  test("an empty button label shows no button", () => {
    expect(renderToStaticMarkup(<AdwBanner title="Hi" buttonLabel="" revealed />)).not.toContain(
      "<button",
    );
  });

  test("a hidden banner keeps its nodes, with its child hidden in a closed revealer", () => {
    const html = renderToStaticMarkup(
      <AdwBanner title="You are offline" buttonLabel="Retry" className="mine" />,
    );
    expect(html).toContain('class="gtk-banner gtk-bin-layout mine"');
    expect(html).toContain(
      '<div class="gtk-revealer" style="height:0;overflow:clip;visibility:hidden"><div class="gtk-widget">',
    );
    expect(html).toContain("<button");
  });
});

// Widths as GTK 4.22.4 / libadwaita 1.8.4 measure them for "You are offline"
// (99px) and a "Retry" button (71px), in the gizmo's content box.
describe("bannerLayout(), like allocate_content()", () => {
  test("centers the title when there's 36px around the button", () => {
    expect(bannerLayout(774, 99, 71)).toBe("center");
    expect(bannerLayout(339, 99, 71)).toBe("center");
  });

  test("puts the title at the start when centering it would crowd the button", () => {
    expect(bannerLayout(338, 99, 71)).toBe("start");
    expect(bannerLayout(288, 99, 71)).toBe("start");
    expect(bannerLayout(195, 99, 71)).toBe("start");
  });

  test("stacks them when the title, 6px of spacing and the 84px button don't fit", () => {
    expect(bannerLayout(194, 99, 71)).toBe("stacked");
    expect(bannerLayout(172, 99, 71)).toBe("stacked");
  });

  test("counts a wider button at its own width", () => {
    expect(bannerLayout(760, 643, 105)).toBe("start");
    expect(bannerLayout(759, 643, 105)).toBe("stacked");
  });

  test("without a button, pads the title, then wraps it", () => {
    expect(bannerLayout(774, 99, null)).toBe("padded");
    expect(bannerLayout(111, 99, null)).toBe("padded");
    expect(bannerLayout(110, 99, null)).toBe("wrap");
    expect(bannerLayout(99, 99, null)).toBe("wrap");
    expect(bannerLayout(98, 99, null)).toBe("fill");
  });
});
