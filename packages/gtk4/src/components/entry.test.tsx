import { createGtkIcon } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkProvider } from "../provider.tsx";
import { GtkEntry, type GtkEntryProps } from "./entry.tsx";

const icons = { EditFind: createGtkIcon("EditFind", [["path", { d: "M0 0h16v16H0z" }]]) };
const render = (props: GtkEntryProps) =>
  renderToStaticMarkup(
    <GtkProvider icons={icons}>
      <GtkEntry {...props} />
    </GtkProvider>,
  );
const input = (html: string) => html.match(/<input[^>]*>/)?.[0] ?? "";

describe("GtkEntry", () => {
  test("an insensitive entry is :disabled, and so is its text", () => {
    const html = render({ text: "Hello", disabled: true });
    expect(html).toMatch(/<div class="gtk-entry" data-disabled="true"/);
    expect(input(html)).toContain('disabled=""');
  });

  test("the input purpose only hints the input method; visibility alone hides the text", () => {
    expect(input(render({ inputPurpose: "number" }))).toMatch(/type="text" inputMode="decimal"/);
    expect(input(render({ inputPurpose: "password" }))).toMatch(/type="text"/);
    expect(input(render({ inputPurpose: "password" }))).not.toContain("inputMode");
    expect(input(render({ visibility: false }))).toMatch(/type="password"/);
  });

  test("max-length counts characters and cuts the text, like GtkEntryBuffer", () => {
    expect(input(render({ text: "abcdefgh", maxLength: 3 }))).toContain('value="abc"');
    expect(input(render({ text: "😀😀😀", maxLength: 2 }))).toContain('value="😀😀"');
    expect(input(render({ text: "abc", maxLength: 3 }))).not.toContain("maxLength");
  });

  test("editable=false makes the text read-only", () => {
    expect(input(render({ editable: false }))).toContain('readOnly=""');
    expect(input(render({}))).not.toContain("readOnly");
  });

  test("icons are image.left and image.right around the text", () => {
    const html = render({ primaryIconName: "EditFind", secondaryIconName: "EditFind" });
    expect(html).toMatch(/<span class="gtk-image left">.*<input.*<span class="gtk-image right">/);
  });
});
