import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkBox } from "./box.tsx";
import { GtkButton } from "./button.tsx";
import { GtkImage } from "./image.tsx";
import { GtkLabel } from "./label.tsx";
import { GtkToggleButton } from "./toggle-button.tsx";

const classOf = (html: string) => html.match(/<button[^>]*class="([^"]*)"/)?.[1]?.split(" ");

describe("style classes", () => {
  test("a label or image child makes a text or image button, like gtk_button_set_child()", () => {
    expect(
      classOf(
        renderToStaticMarkup(
          <GtkButton>
            <GtkLabel label="Add" />
          </GtkButton>,
        ),
      ),
    ).toContain("text-button");
    expect(
      classOf(
        renderToStaticMarkup(
          <GtkButton>
            <GtkImage iconName="list-add-symbolic" />
          </GtkButton>,
        ),
      ),
    ).toContain("image-button");
    const other = classOf(
      renderToStaticMarkup(
        <GtkButton>
          <GtkBox />
        </GtkButton>,
      ),
    );
    expect(other).not.toContain("text-button");
    expect(other).not.toContain("image-button");
  });
});

describe("tooltipText", () => {
  test("is the button's tooltip and accessible description, not a browser tooltip", () => {
    const html = renderToStaticMarkup(<GtkButton label="Add" tooltipText="Add a folder" />);
    expect(html).toContain('data-gtk-tooltip="Add a folder"');
    expect(html).toContain('aria-description="Add a folder"');
    expect(html).not.toContain("title=");
    expect(
      renderToStaticMarkup(<GtkToggleButton label="Bold" tooltipText="Bold text" />),
    ).toContain('data-gtk-tooltip="Bold text"');
  });
});
