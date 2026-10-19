// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { IconProvider } from "../icon-context.tsx";
import { GtkLabel } from "./label.tsx";
import { GtkStack, GtkStackPage, GtkStackSwitcher } from "./stack.tsx";

const LABEL =
  '<span class="gtk-label" style="text-align:start;user-select:none;justify-content:center;white-space:pre"';

describe("GtkStack", () => {
  test("a hidden page keeps its element and place, only marked hidden", () => {
    // Under the same key, a hidden page that changed element type (a wrapper)
    // would remount on every switch, losing its state.
    const html = (name: string) =>
      renderToStaticMarkup(
        <GtkStack visibleChildName={name}>
          <GtkStackPage name="one">
            <GtkLabel label="One" />
          </GtkStackPage>
          <GtkStackPage name="two">
            <GtkLabel label="Two" />
          </GtkStackPage>
        </GtkStack>,
      );
    const hidden = ' data-stack-hidden="" aria-hidden="true" inert=""';
    expect(html("one")).toBe(
      `<div role="group" class="gtk-stack" style="position:relative">${LABEL}>One</span>${LABEL}${hidden}>Two</span></div>`,
    );
    expect(html("two")).toBe(
      `<div role="group" class="gtk-stack" style="position:relative">${LABEL}${hidden}>One</span>${LABEL}>Two</span></div>`,
    );
  });

  test("an unknown visible child name shows the first visible page", () => {
    const html = renderToStaticMarkup(
      <GtkStack visibleChildName="nope" hhomogeneous={false}>
        <GtkStackPage name="gone" visible={false}>
          <GtkLabel label="Gone" />
        </GtkStackPage>
        <GtkStackPage name="one">
          <GtkLabel label="One" />
        </GtkStackPage>
        <GtkStackPage name="two">
          <GtkLabel label="Two" />
        </GtkStackPage>
      </GtkStack>,
    );
    expect(html).toContain('data-hhomogeneous="false"');
    expect(html).toContain(`${LABEL} hidden="">Gone</span>`);
    expect(html).toContain(`${LABEL}>One</span>`);
    expect(html).toContain(`${LABEL} data-stack-hidden="" aria-hidden="true" inert="">Two</span>`);
  });

  test("a page that isn't one element is wrapped", () => {
    const html = renderToStaticMarkup(
      <GtkStack>
        <GtkStackPage name="text">Some text</GtkStackPage>
      </GtkStack>,
    );
    expect(html).toContain("<div>Some text</div>");
  });
});

describe("GtkStackSwitcher", () => {
  const Icon = () => <svg />;
  const html = renderToStaticMarkup(
    <IconProvider value={{ EditFind: Icon } as never}>
      <GtkStackSwitcher
        activePageName="text"
        pages={[
          { name: "text", title: "Text", needsAttention: true },
          { name: "icon", title: "Find", iconName: "EditFind" },
          { name: "untitled" },
          { name: "hidden", title: "Hidden", visible: false },
        ]}
      />
    </IconProvider>,
  );
  const buttons = html.match(/<button[^>]*>.*?<\/button>/g) ?? [];

  test("tabs are a label or an icon, centered, and only for visible pages with either", () => {
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toMatch(/class="gtk-button toggle text-button needs-attention"/);
    expect(buttons[0]).toContain('<span class="gtk-label" data-halign="center"');
    expect(buttons[0]).not.toContain("title=");
    expect(buttons[1]).toMatch(/class="gtk-button toggle image-button"/);
    expect(buttons[1]).toContain('data-gtk-tooltip="Find"');
    expect(buttons[1]).toContain('aria-label="Find"');
    expect(buttons[1]).toContain('<span class="gtk-image" data-halign="center"><svg></svg></span>');
  });

  test("tabs expand, are tabs rather than toggle buttons, and don't submit forms", () => {
    for (const button of buttons) {
      expect(button).toContain('type="button"');
      expect(button).toContain('role="tab"');
      expect(button).toContain('data-hexpand="true" data-vexpand="true"');
      expect(button).not.toContain("aria-pressed");
    }
    expect(buttons[0]).toContain('aria-selected="true"');
    expect(buttons[1]).toContain('aria-selected="false"');
  });

  test("the switcher is orientable", () => {
    const vertical = renderToStaticMarkup(<GtkStackSwitcher orientation="vertical" pages={[]} />);
    expect(vertical).toContain('class="gtk-stackswitcher vertical linked"');
    expect(vertical).toContain('aria-orientation="vertical"');
  });
});
