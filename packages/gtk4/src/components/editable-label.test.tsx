// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkEditableLabel, type GtkEditableLabelProps } from "./editable-label.tsx";

/** The opening tags of the editablelabel, its label and its text. */
function render(props: GtkEditableLabelProps) {
  const html = renderToStaticMarkup(<GtkEditableLabel {...props} />);
  const tag = (re: RegExp) => html.match(re)?.[0] ?? "";
  return {
    root: tag(/<div[^>]*gtk-editablelabel[^>]*>/),
    label: tag(/<span[^>]*gtk-label[^>]*>/),
    text: tag(/<input[^>]*>/),
  };
}

describe("GtkEditableLabel", () => {
  test("editing through the prop shows the current text in the text", () => {
    expect(render({ text: "Editable", editing: true }).text).toContain('value="Editable"');
  });

  test("both stack pages are rendered; the hidden one is out of the tab order", () => {
    const display = render({ text: "Label" });
    expect(display.label).not.toContain("aria-hidden");
    expect(display.text).toContain('aria-hidden="true"');
    expect(display.text).toContain('tabindex="-1"');

    const editing = render({ text: "Label", editing: true });
    expect(editing.label).toContain('aria-hidden="true"');
    expect(editing.text).not.toContain("aria-hidden");
    expect(editing.text).not.toContain("tabindex");
  });

  test("the editablelabel itself takes the focus, outside of editing", () => {
    const display = render({ text: "Label" });
    expect(display.root).toContain('tabindex="0"');
    expect(display.label).not.toContain("tabindex");
    expect(render({ text: "Label", editing: true }).root).toContain('tabindex="-1"');
  });

  test("disabled marks the widget and its label insensitive and makes it unfocusable", () => {
    const { root, label, text } = render({ text: "Label", disabled: true });
    expect(root).toContain("data-disabled");
    expect(root).not.toContain("tabindex");
    expect(root).not.toMatch(/ disabled=/);
    expect(label).toContain("data-disabled");
    expect(text).toContain("disabled");
  });
});
