// Unit tests — no Playwright/cargo preload needed.

import { GtkLabel, IconProvider } from "@gtk-js/gtk4";
import { createGtkIcon } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwButtonContent } from "./button-content.tsx";
import { AdwSplitButton, type AdwSplitButtonProps } from "./split-button.tsx";

// GtkPopover checks whether its portal target is an HTMLElement; there's no DOM
// when rendering to a string.
globalThis.HTMLElement ??= class {} as unknown as typeof HTMLElement;

const Icon = createGtkIcon("Icon", [["path", { d: "M0 0h16v16H0z" }]]);
const icons = { MissingIcon: Icon, PanDown: Icon, PanUp: Icon };

function render(props: AdwSplitButtonProps) {
  return renderToStaticMarkup(
    <IconProvider value={icons}>
      <AdwSplitButton popover={<GtkLabel label="Popover" />} {...props} />
    </IconProvider>,
  );
}

/** The opening tags of the root, the main button and the arrow button. */
function nodes(html: string) {
  const [root, main] = html.match(/<(div|button)[^>]*>/g) ?? [];
  const arrow = html.match(/<div class="gtk-menubutton[^>]*>(<button[^>]*>)/)?.[1];
  return { root, main, arrow };
}

const classes = (tag = "") => tag.match(/class="([^"]*)"/)?.[1]?.split(" ") ?? [];

describe("AdwSplitButton", () => {
  test("styles the split button rather than its buttons (update_style_classes())", () => {
    const { root, main, arrow } = nodes(render({ label: "Save" }));
    expect(classes(root)).toContain("text-button");
    expect(classes(main)).toEqual(["gtk-button"]);
    expect(classes(arrow)).toEqual(["gtk-button", "toggle"]);
    expect(root).toContain('role="group"');
  });

  test("its button expands, the split button doesn't", () => {
    const { root, main } = nodes(render({ label: "Save" }));
    expect(root).toContain('data-hexpand="false"');
    expect(main).toContain('data-hexpand="true"');
  });

  test("shows one of child, icon and label", () => {
    const html = render({ label: "Save", iconName: "NoSuchIcon" });
    expect(classes(nodes(html).root)).toContain("image-button");
    expect(classes(nodes(html).root)).not.toContain("text-button");
    expect(html).not.toContain("Save");
    // An unknown icon shows image-missing, like GtkImage.
    expect(html).toMatch(/<span class="gtk-image"[^>]*><svg/);
  });

  test("an AdwButtonContent child makes the split button .image-text-button", () => {
    const { root, main } = nodes(
      render({ child: <AdwButtonContent iconName="DocumentSave" label="Save" /> }),
    );
    expect(classes(root)).toContain("image-text-button");
    expect(classes(main)).toEqual(["gtk-button"]);
  });

  test("useUnderline makes the label a mnemonic one, its underscore hidden", () => {
    expect(render({ label: "_Save", useUnderline: true })).toContain("<span>S</span>ave<");
    expect(render({ label: "_Save" })).toContain(">_Save<");
  });

  test("canShrink ellipsizes the label", () => {
    expect(render({ label: "Save", canShrink: true })).toContain("text-overflow:ellipsis");
    expect(render({ label: "Save" })).not.toContain("text-overflow:ellipsis");
  });

  test("disabled makes both buttons insensitive", () => {
    const { root, main, arrow } = nodes(render({ label: "Save", disabled: true }));
    expect(root).toContain("data-disabled");
    expect(main).toContain("disabled");
    expect(arrow).toContain("disabled");
  });

  test("without a popover the arrow button is insensitive (update_sensitivity())", () => {
    const html = renderToStaticMarkup(<AdwSplitButton label="Save" />);
    expect(nodes(html).arrow).toContain("disabled");
    expect(nodes(html).root).not.toContain("data-disabled");
  });

  test("the arrow follows the direction; none is pan-down", () => {
    expect(render({ label: "Save", direction: "up" })).toMatch(/class="gtk-arrow up"[^>]*><svg/);
    expect(render({ label: "Save", direction: "none" })).toMatch(
      /class="gtk-arrow none"[^>]*><svg/,
    );
  });

  test("its button is labelled by the group when the group has a label", () => {
    expect(nodes(render({ label: "Save" })).main).not.toContain("aria-labelledby");
    const { root, main } = nodes(render({ label: "Save", "aria-label": "Save file", id: "sb" }));
    expect(root).toContain('id="sb"');
    expect(main).toContain('aria-labelledby="sb"');
  });
});
