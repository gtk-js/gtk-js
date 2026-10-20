// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import {
  acceleratorLabel,
  GtkModelButton,
  GtkPopoverMenu,
  matchesAccelerator,
  parseAccelerator,
} from "./popover-menu.tsx";

const key = (key: string, mods: Partial<KeyboardEvent> = {}) =>
  ({
    key,
    code: "",
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...mods,
  }) as KeyboardEvent;

describe("GtkPopoverMenu accelerators", () => {
  test("GTK syntax and the shown form parse to the same key, shown like gtk_accelerator_get_label()", () => {
    for (const accel of ["<Control>q", "<Primary>Q", "Ctrl+Q"]) {
      const parsed = parseAccelerator(accel);
      expect(parsed && acceleratorLabel(parsed)).toBe("Ctrl+Q");
    }
    expect(acceleratorLabel(parseAccelerator("<Shift><Control>Page_Up")!)).toBe(
      "Shift+Ctrl+Page Up",
    );
    expect(acceleratorLabel(parseAccelerator("<Control>comma")!)).toBe("Ctrl+,");
    expect(acceleratorLabel(parseAccelerator("<Alt>space")!)).toBe("Alt+Space");
    expect(acceleratorLabel(parseAccelerator("F10")!)).toBe("F10");
    expect(parseAccelerator("<Bogus>q")).toBeNull();
  });

  test("a key press matches with exactly its modifiers", () => {
    const ctrlQ = parseAccelerator("<Control>q")!;
    expect(matchesAccelerator(ctrlQ, key("q", { ctrlKey: true }))).toBe(true);
    expect(matchesAccelerator(ctrlQ, key("q"))).toBe(false);
    expect(matchesAccelerator(ctrlQ, key("Q", { ctrlKey: true, shiftKey: true }))).toBe(false);
    // Shift only picks a symbol's character.
    const ctrlPlus = parseAccelerator("<Control>plus")!;
    expect(matchesAccelerator(ctrlPlus, key("+", { ctrlKey: true, shiftKey: true }))).toBe(true);
    const enter = parseAccelerator("<Control>Return")!;
    expect(matchesAccelerator(enter, key("Enter", { ctrlKey: true }))).toBe(true);
  });
});

describe("GtkModelButton", () => {
  test("the label's mnemonic underscore isn't shown (gtk_label_set_text_with_mnemonic())", () => {
    const html = renderToStaticMarkup(<GtkModelButton label="_Quit" accel="<Control>q" />);
    expect(html.replace(/<[^>]+>/g, "")).toBe("QuitCtrl+Q");
    // Like strip_ulines(): "__" is an underscore, and every "_x" drops its underscore.
    const saveAs = renderToStaticMarkup(<GtkModelButton label="Save __As _Copy" />);
    expect(saveAs.replace(/<[^>]+>/g, "")).toBe("Save _As Copy");
  });

  test("an insensitive item's label is insensitive too, so the theme dims it", () => {
    const html = renderToStaticMarkup(<GtkModelButton label="Item" accel="Ctrl+I" disabled />);
    expect(html).toMatch(/class="gtk-label" data-disabled=/);
    expect(html).toMatch(/class="gtk-accelerator" data-disabled=/);
    expect(renderToStaticMarkup(<GtkModelButton label="Item" />)).not.toContain("data-disabled");
  });
});

describe("GtkPopoverMenu", () => {
  test("the stack is in a scrolled window, so a long menu scrolls (gtk_popover_menu_init())", () => {
    const html = renderToStaticMarkup(<GtkPopoverMenu model={[[{ label: "A" }]]} />);
    const classes = [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1]?.split(" ")[0]);
    expect(classes.slice(0, 5)).toEqual([
      "gtk-scrolledwindow",
      "gtk-viewport",
      "gtk-stack",
      "gtk-box",
      "gtk-modelbutton",
    ]);
  });
});
