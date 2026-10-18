import { createGtkIcon } from "@gtk-js/icon-helpers";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { IconProvider } from "../icon-context.tsx";
import { GtkBox } from "./box.tsx";
import { GtkButton } from "./button.tsx";
import { GtkImage } from "./image.tsx";
import { GtkLabel } from "./label.tsx";
import { GtkToggleButton } from "./toggle-button.tsx";

const classOf = (html: string) => html.match(/<button[^>]*class="([^"]*)"/)?.[1]?.split(" ");

const icons = {
  ListAdd: createGtkIcon("ListAdd", [["path", { d: "M7 1h2v14H7z" }]]),
  ImageMissing: createGtkIcon("ImageMissing", [["path", { d: "M0 0h16v16H0z" }]]),
};
const withIcons = (element: ReactElement) =>
  renderToStaticMarkup(<IconProvider value={icons}>{element}</IconProvider>);

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

  test("a toggle button is a button: its label or image child sets the same classes", () => {
    const label = (
      <GtkToggleButton>
        <GtkLabel label="Bold" />
      </GtkToggleButton>
    );
    const image = (
      <GtkToggleButton>
        <GtkImage iconName="ListAdd" />
      </GtkToggleButton>
    );
    expect(classOf(renderToStaticMarkup(label))).toEqual(["gtk-button", "text-button", "toggle"]);
    expect(classOf(renderToStaticMarkup(image))).toEqual(["gtk-button", "image-button", "toggle"]);
  });
});

describe("children", () => {
  test("a toggle button shows its icon", () => {
    const html = withIcons(<GtkToggleButton iconName="ListAdd" />);
    expect(html).toContain("gtk-icon-ListAdd");
    expect(classOf(html)).toContain("image-button");
  });

  test("an unknown icon shows image-missing, like gtk_button_set_icon_name()", () => {
    expect(withIcons(<GtkButton iconName="NoSuchIcon" />)).toContain("gtk-icon-ImageMissing");
  });

  test("an icon and a label sit in one box, which .image-text-button spaces", () => {
    const html = withIcons(<GtkButton iconName="ListAdd" label="Add" />);
    expect(html).toMatch(
      /<button[^>]*><div class="gtk-box gtk-box-layout horizontal" data-halign="center"[^>]*><span class="gtk-image" data-valign="center">.*<\/span><span class="gtk-label"[^>]*>Add<\/span><\/div><\/button>/,
    );
  });

  test("the label stays on one line, and ellipsizes when the button can shrink", () => {
    const plain = renderToStaticMarkup(<GtkButton label="A long label" />);
    expect(plain).toContain("white-space:pre");
    expect(plain).not.toContain("text-overflow");
    const shrink = renderToStaticMarkup(<GtkButton label="A long label" canShrink />);
    expect(shrink).toContain("overflow:hidden");
    expect(shrink).toContain("text-overflow:ellipsis");
  });
});

describe("mnemonics", () => {
  test("the underscore is hidden and nothing is underlined until Alt is held", () => {
    const html = renderToStaticMarkup(<GtkButton label="_Save File" useUnderline />);
    expect(html).toContain("<span><span>S</span>ave File</span>");
    expect(html).not.toContain("underline");
  });

  test("a double underscore is a literal one", () => {
    expect(renderToStaticMarkup(<GtkButton label="Save__As" useUnderline />)).toContain(
      ">Save_As</span>",
    );
  });

  test("without useUnderline the label is shown as is", () => {
    expect(renderToStaticMarkup(<GtkButton label="_Save" />)).toContain(">_Save</span>");
  });
});

describe("type", () => {
  test("is button, so a form isn't submitted", () => {
    expect(renderToStaticMarkup(<GtkButton label="Add" />)).toContain('type="button"');
    expect(renderToStaticMarkup(<GtkToggleButton label="Bold" />)).toContain('type="button"');
    expect(renderToStaticMarkup(<GtkButton label="Go" type="submit" />)).toContain('type="submit"');
  });
});

describe("disabled", () => {
  test("marks the button insensitive", () => {
    const html = renderToStaticMarkup(<GtkToggleButton label="Bold" disabled />);
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-disabled="true"');
  });
});

describe("tooltipText", () => {
  test("is the button's tooltip", () => {
    expect(renderToStaticMarkup(<GtkButton label="Add" tooltipText="Add a folder" />)).toContain(
      'title="Add a folder"',
    );
    expect(
      renderToStaticMarkup(<GtkToggleButton label="Bold" tooltipText="Bold text" />),
    ).toContain('title="Bold text"');
  });
});
