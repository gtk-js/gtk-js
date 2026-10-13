import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GtkButton } from "./button.tsx";
import { GtkToggleButton } from "./toggle-button.tsx";

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
