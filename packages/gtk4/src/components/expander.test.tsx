import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkCheckButton } from "./check-button.tsx";
import { GtkExpander } from "./expander.tsx";

/** The opening tag of the first element whose class starts with these classes. */
function tag(html: string, classes: string): string {
  const match = html.match(new RegExp(`<[a-z]+ [^>]*class="${classes}[^"]*"[^>]*>`));
  expect(match, classes).not.toBeNull();
  return match?.[0] ?? "";
}

describe("GtkExpander", () => {
  test("the expander-widget takes the focus, and its title is a horizontal box", () => {
    const html = renderToStaticMarkup(<GtkExpander label="Details" />);
    const root = tag(html, "gtk-expander-widget");
    expect(root).toContain('role="button"');
    expect(root).toContain('tabindex="0"');
    expect(root).toContain('aria-expanded="false"');
    const title = tag(html, "gtk-title");
    expect(title).toContain('class="gtk-title gtk-box-layout horizontal"');
    expect(title).not.toContain("tabindex");
  });

  test("a collapsed child stays mounted, hidden", () => {
    const html = renderToStaticMarkup(
      <GtkExpander label="Details">
        <GtkCheckButton label="Child" />
      </GtkExpander>,
    );
    expect(html).toMatch(/<div id="[^"]+" hidden=""><div role="checkbox"/);
    expect(tag(html, "gtk-expander-widget")).not.toContain("aria-controls");
  });

  test("an expanded child is laid out in the box and controlled by the expander", () => {
    const html = renderToStaticMarkup(
      <GtkExpander label="Details" expanded>
        <GtkCheckButton label="Child" />
      </GtkExpander>,
    );
    const id = html.match(/<div id="([^"]+)" class="gtk-box-layout vertical">/)?.[1];
    expect(id).toBeDefined();
    expect(tag(html, "gtk-expander-widget")).toContain(`aria-controls="${id}"`);
  });

  test("an insensitive expander can't be focused or used, and dims its arrow and label", () => {
    const html = renderToStaticMarkup(<GtkExpander label="Details" disabled />);
    const root = tag(html, "gtk-expander-widget");
    expect(root).toContain("inert");
    expect(root).toContain('aria-disabled="true"');
    expect(root).not.toContain("tabindex");
    for (const node of [
      "gtk-expander-widget",
      "gtk-box",
      "gtk-title",
      "gtk-expander horizontal",
      "gtk-label",
    ]) {
      expect(tag(html, node)).toContain("data-disabled");
    }
  });

  test("the label takes mnemonics and markup, like gtk_expander_set_use_underline()", () => {
    expect(renderToStaticMarkup(<GtkExpander label="_More Options" useUnderline />)).toContain(
      '<span class="gtk-label">More Options</span>',
    );
    expect(renderToStaticMarkup(<GtkExpander label="_More" />)).toContain(">_More</span>");
    expect(renderToStaticMarkup(<GtkExpander label="<b>Bold</b> text" useMarkup />)).toContain(
      '<span class="gtk-label"><span><span style="font-weight:bold">Bold</span> text</span></span>',
    );
  });
});
