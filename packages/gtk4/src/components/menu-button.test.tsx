// Unit tests — no Playwright/cargo preload needed.

import { createGtkIcon } from "@gtk-js/icon-helpers";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { IconProvider } from "../icon-context.tsx";
import { GtkLabel } from "./label.tsx";
import { GtkMenuButton, type GtkMenuButtonProps } from "./menu-button.tsx";
import { type GtkMenuModel, GtkPopoverMenu } from "./popover-menu.tsx";

// GtkPopover checks whether its portal target is an HTMLElement; there's no DOM
// when rendering to a string.
globalThis.HTMLElement ??= class {} as unknown as typeof HTMLElement;

const model: GtkMenuModel = [[{ label: "Preferences" }, { label: "About" }]];

const Icon = createGtkIcon("Icon", [["path", { d: "M0 0h16v16H0z" }]]);
const icons = { OpenMenu: Icon, PanDown: Icon, MissingIcon: Icon };

function render(props: GtkMenuButtonProps) {
  return renderToStaticMarkup(
    <IconProvider value={icons}>
      <GtkMenuButton popover={<GtkLabel label="Popover" />} {...props} />
    </IconProvider>,
  );
}

/** The opening tags of the menubutton and its button. */
function nodes(html: string) {
  const [root, button] = html.match(/<(div|button)[^>]*>/g) ?? [];
  return { root, button };
}

const classes = (tag = "") => tag.match(/class="([^"]*)"/)?.[1]?.split(" ") ?? [];

describe("GtkMenuButton nodes", () => {
  test("the menubutton is .popup and its open button just :checked (gtk_menu_button_init())", () => {
    const { root, button } = nodes(render({ label: "Menu", active: true }));
    expect(classes(root)).toEqual(["gtk-menubutton", "popup"]);
    expect(button).toContain("data-checked");
    expect(classes(button)).not.toContain("has-open-popup");
  });

  test("a label and the arrow sit in a box, the label on one line (gtk_menu_button_set_label())", () => {
    const html = render({ label: "Menu" });
    expect(html).toMatch(
      /<button[^>]*><div class="gtk-box gtk-box-layout horizontal" data-hexpand="false"[^>]*><span class="gtk-label" data-hexpand="true"[^>]*white-space:pre[^>]*>Menu<\/span><span class="gtk-arrow down"><svg/,
    );
    expect(html).not.toContain("text-overflow");
    expect(render({ label: "Menu", canShrink: true })).toContain("text-overflow:ellipsis");
  });

  test("an icon and the arrow sit in a centered box (gtk_menu_button_set_icon_name())", () => {
    expect(render({ iconName: "OpenMenu", alwaysShowArrow: true })).toMatch(
      /<button[^>]*><div class="gtk-box gtk-box-layout horizontal" data-halign="center"[^>]*><span class="gtk-image"><svg.*<\/svg><\/span><span class="gtk-arrow down"><svg/,
    );
  });

  test("an unknown icon shows image-missing, like GtkImage", () => {
    expect(render({ iconName: "NoSuchIcon" })).toMatch(/<span class="gtk-image"><svg/);
  });

  test("a child sits in an expanding contents node (gtk_menu_button_set_child())", () => {
    expect(render({ children: <GtkLabel label="Child" />, alwaysShowArrow: true })).toMatch(
      /<div class="gtk-contents gtk-bin-layout" data-hexpand="true"><span class="gtk-label"[^>]*>Child<\/span><\/div><span class="gtk-arrow down">/,
    );
  });

  test("the arrow alone is the button's centered child (add_arrow())", () => {
    expect(render({})).toMatch(
      /<button[^>]*><span class="gtk-arrow down" data-halign="center"><svg/,
    );
  });

  test("direction none shows no arrow next to a label (update_arrow())", () => {
    const html = render({ label: "Menu", direction: "none" });
    expect(html).not.toContain("gtk-arrow");
    expect(classes(nodes(html).button)).not.toContain("arrow-button");
    // Alone, the arrow is the open-menu icon.
    expect(render({ direction: "none" })).toContain('class="gtk-arrow none"');
  });
});

describe("GtkMenuButton sensitivity", () => {
  test("disabled makes the menubutton :disabled, which the theme dims", () => {
    const { root, button } = nodes(render({ label: "Menu", disabled: true }));
    expect(root).toContain("data-disabled");
    expect(button).toContain("disabled");
  });

  test("without a popover the button is insensitive, the menubutton not (update_sensitivity())", () => {
    const { root, button } = nodes(renderToStaticMarkup(<GtkMenuButton label="Menu" />));
    expect(root).not.toContain("data-disabled");
    expect(button).toContain('disabled=""');
  });
});

/** The CSS classes of the open popover. */
function popoverClasses(props: { popover?: ReactNode; menuModel?: GtkMenuModel }): string[] {
  const html = renderToStaticMarkup(<GtkMenuButton label="Menu" active {...props} />);
  const classes = html.match(/class="(gtk-popover[^"]*)"/)?.[1];
  expect(classes).toBeDefined();
  return classes?.split(" ") ?? [];
}

describe("GtkMenuButton popover", () => {
  test("a menu model renders popover.menu", () => {
    expect(popoverClasses({ menuModel: model })).toContain("menu");
  });

  test("a GtkPopoverMenu passed as the popover renders popover.menu", () => {
    expect(popoverClasses({ popover: <GtkPopoverMenu model={model} /> })).toContain("menu");
  });

  test("custom popover content isn't a menu", () => {
    expect(popoverClasses({ popover: <div>Custom</div> })).not.toContain("menu");
  });
});

describe("GtkPopoverMenu focus", () => {
  test("the menu takes the focus and moves it between its items, which leave the page's tab order", () => {
    const html = renderToStaticMarkup(<GtkMenuButton label="Menu" active menuModel={model} />);
    expect(html).toMatch(/role="menu" tabindex="-1"/);
    const items = [...html.matchAll(/<button[^>]*role="menuitem"[^>]*>/g)].map((m) => m[0]);
    expect(items).toHaveLength(2);
    for (const item of items) expect(item).toContain('tabindex="-1"');
  });
});
