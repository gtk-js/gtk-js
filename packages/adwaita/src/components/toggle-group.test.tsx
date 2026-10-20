// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import {
  type AdwToggle,
  AdwToggleGroup,
  type AdwToggleGroupProps,
  nextFocusable,
  resolveActive,
} from "./toggle-group.tsx";

const icons = {
  ViewList: () => <svg data-icon="ViewList" />,
  MissingIcon: () => <svg data-icon="image-missing" />,
};

const list: AdwToggle = { name: "list", label: "List" };
const grid: AdwToggle = { name: "grid", label: "Grid" };
const compact: AdwToggle = { name: "compact", label: "Compact" };
const text = [list, grid, compact];

function render(props: Partial<AdwToggleGroupProps> & { toggles: AdwToggle[] }) {
  return renderToStaticMarkup(
    <IconProvider value={icons as never}>
      <AdwToggleGroup {...props} />
    </IconProvider>,
  );
}

/** The opening tags of the group's toggles and separators, in order. */
function children(html: string) {
  return [...html.matchAll(/<(button|div role="separator")[^>]*>/g)].map((m) => m[0]);
}
const toggles = (html: string) => children(html).filter((tag) => tag.startsWith("<button"));
const separators = (html: string) => children(html).filter((tag) => !tag.startsWith("<button"));
const checked = (html: string) =>
  toggles(html).flatMap((tag, i) => (tag.includes('aria-checked="true"') ? [i] : []));

describe("AdwToggleGroup active toggle", () => {
  test("without active or activeName, the first enabled toggle is active, like add_toggle()", () => {
    expect(checked(render({ toggles: text }))).toEqual([0]);
    const firstOff = [{ ...list, enabled: false }, grid, compact];
    expect(checked(render({ toggles: firstOff }))).toEqual([1]);
    expect(resolveActive(firstOff, undefined, undefined, "compact")).toBe(2);
  });

  test("active and activeName pick the toggle", () => {
    expect(checked(render({ toggles: text, active: 2 }))).toEqual([2]);
    expect(checked(render({ toggles: text, activeName: "grid" }))).toEqual([1]);
    expect(resolveActive(text, 0, "compact", "grid")).toBe(2);
  });

  test("a disabled toggle is never active, like set_active_toggle()", () => {
    const off = [list, { ...grid, enabled: false }, compact];
    expect(checked(render({ toggles: off, active: 1 }))).toEqual([]);
    expect(checked(render({ toggles: off, activeName: "grid" }))).toEqual([]);
    expect(resolveActive(off, undefined, undefined, "grid")).toBe(-1);
    expect(resolveActive(off, 5, undefined, undefined)).toBe(-1);
  });
});

describe("AdwToggleGroup focus", () => {
  test("the active toggle is the only Tab stop, like adw_toggle_group_focus()", () => {
    const tabIndexes = (html: string) =>
      toggles(html).map((tag) => /tabindex="(-?\d)"/.exec(tag)![1]);
    expect(tabIndexes(render({ toggles: text, active: 1 }))).toEqual(["-1", "0", "-1"]);
    // No active toggle: the first one that can take focus.
    const off = [{ ...list, enabled: false }, grid, compact];
    expect(tabIndexes(render({ toggles: off, active: 0 }))).toEqual(["-1", "0", "-1"]);
  });

  test("arrows move to the next enabled toggle and stop at the ends", () => {
    const off = [list, { ...grid, enabled: false }, compact];
    expect(nextFocusable(off, 0, 1)).toBe(2);
    expect(nextFocusable(off, 2, -1)).toBe(0);
    expect(nextFocusable(off, 2, 1)).toBe(-1);
    expect(nextFocusable(off, 0, -1)).toBe(-1);
  });
});

describe("AdwToggleGroup separators", () => {
  test("take the group's orientation, like gtk_separator_new (self->orientation)", () => {
    expect(separators(render({ toggles: text }))[0]).toContain("gtk-separator horizontal");
    const vertical = render({ toggles: text, orientation: "vertical" });
    expect(separators(vertical)[0]).toContain("gtk-separator vertical");
  });

  test("hide next to the checked toggle, like should_hide_separators()", () => {
    const hidden = (html: string) => separators(html).map((tag) => tag.includes("gtk-hidden"));
    expect(hidden(render({ toggles: text, active: 0 }))).toEqual([true, false]);
    expect(hidden(render({ toggles: text, active: 1 }))).toEqual([true, true]);
    expect(hidden(render({ toggles: text, active: 2 }))).toEqual([false, true]);
  });
});

describe("AdwToggleGroup toggles", () => {
  test("are expanding toggle buttons laid out like GtkButton", () => {
    const [tag] = toggles(render({ toggles: text }));
    expect(tag).toContain('class="gtk-toggle toggle gtk-bin-layout text-button"');
    expect(tag).toContain('type="button"');
    expect(tag).toContain('data-hexpand="true"');
    expect(tag).toContain('data-vexpand="true"');
  });

  test("ellipsize their labels with canShrink, like gtk_button_set_can_shrink()", () => {
    expect(render({ toggles: text })).toContain("text-overflow:ellipsis");
    expect(render({ toggles: text, canShrink: false })).not.toContain("text-overflow:ellipsis");
  });

  test("show an icon and a label in a buttoncontent, like update_content()", () => {
    const html = render({ toggles: [{ name: "list", iconName: "ViewList", label: "List" }] });
    expect(toggles(html)[0]).toContain("image-text-button");
    expect(html).toMatch(
      /<div [^>]*class="gtk-buttoncontent[^"]*"[^>]*><div class="gtk-box[^"]*"[^>]*><span class="gtk-image"[^>]*><svg data-icon="ViewList"/,
    );
  });

  test("show image-missing for an unknown icon name", () => {
    const html = render({ toggles: [{ name: "x", iconName: "view-list-symbolic" }] });
    expect(toggles(html)[0]).toContain("image-button");
    expect(html).toContain('data-icon="image-missing"');
  });

  test("make the contents of a disabled toggle insensitive too", () => {
    const html = render({
      toggles: [
        { name: "on", label: "On" },
        { name: "off", label: "Off", enabled: false },
        { name: "icon", iconName: "ViewList", enabled: false },
        { name: "both", iconName: "ViewList", label: "Both", enabled: false },
      ],
    });
    const parts = html.split("<button").slice(1);
    expect(parts[0]).not.toContain("disabled");
    expect(parts[1]).toMatch(/^[^>]*disabled=""/);
    expect(parts[1]).toMatch(/class="gtk-label"[^>]*data-disabled="true"/);
    expect(parts[2]).toMatch(/class="gtk-image" data-valign="center" data-disabled="true"/);
    // buttoncontent, its box, image and label.
    expect(parts[3]?.match(/data-disabled="true"/g)).toHaveLength(4);
  });
});

describe("AdwToggleGroup disabled", () => {
  test("makes the group, its separators and every toggle insensitive", () => {
    const html = render({ toggles: text, disabled: true });
    expect(html).toMatch(/^<div role="radiogroup"[^>]*data-disabled="true"/);
    expect(separators(html).every((tag) => tag.includes('data-disabled="true"'))).toBe(true);
    expect(toggles(html).every((tag) => tag.includes('disabled=""'))).toBe(true);
    // The checked toggle stays checked, drawn insensitive.
    expect(checked(html)).toEqual([0]);
  });
});
