import { describe, expect, test } from "vite-plus/test";
import { parseStyleScheme } from "./parse-style-scheme.ts";
import { styleSchemeClass, styleSchemeCSS, styleToCSS } from "./scheme-css.ts";
import { styleSchemes } from "./schemes.ts";
import { GtkSourceStyleScheme } from "./style-scheme.ts";

const css = (id: keyof typeof styleSchemes) =>
  styleSchemeCSS(new GtkSourceStyleScheme(styleSchemes[id]));

describe("styleSchemeCSS", () => {
  test("Adwaita: the text, gutter, cursor, current line and right margin", () => {
    const view = ".gtk-textview.sourceview.source-scheme-Adwaita";
    expect(css("Adwaita")).toBe(
      [
        "/* Adwaita */",
        `${view} { background-color: #FFFFFF; color: #504E55; --gtk-current-color: #504E55; }`,
        `${view} > .gtk-text { background-color: #FFFFFF; color: #504E55; --gtk-current-color: #504E55; }`,
        `${view} > .gtk-border > .gtk-gutter { background-color: #FFFFFF; color: #B0AFAC; --gtk-current-color: #B0AFAC; }`,
        `${view} { caret-color: #77767B; --gtk-source-current-line: #F6F5F4; --gtk-source-current-line-number-color: #9A9996; --gtk-source-current-line-number-background: #F6F5F4; --gtk-source-current-line-number-weight: bold; --gtk-source-right-margin-line: color-mix(in srgb, #77767B 15.686%, #FFFFFF); --gtk-source-right-margin-overlay: color-mix(in srgb, #77767B 5.882%, #FFFFFF); }`,
        "",
      ].join("\n"),
    );
  });

  test("the selection, focused and not; a transparent foreground keeps the text's color", () => {
    const out = css("solarized-light");
    expect(out).toContain(
      ".source-scheme-solarized-light:focus-within > .gtk-text::selection { background-color: rgba(147, 161, 161, .3); }",
    );
    expect(out).toContain(
      ".source-scheme-solarized-light > .gtk-text::selection { background-color: rgba(147, 161, 161, .3); }",
    );
  });

  test("a solid selection without a foreground turns translucent (fix_broken_selection())", () => {
    expect(css("cobalt-light")).toContain(
      "::selection { background-color: rgb(from #30A0FF r g b / 0.3); }",
    );
  });

  test("line-numbers-border, a missing current-line and a non-bold current line number", () => {
    const scheme = new GtkSourceStyleScheme(
      parseStyleScheme(`<style-scheme id="my scheme" name="T" version="1.0">
        <style name="text" foreground="#111111"/>
        <style name="line-numbers-border" background="#ff0000"/>
        <style name="current-line-number" bold="false"/>
        <style name="right-margin" background="#00ff00"/>
      </style-scheme>`),
    );
    expect(styleSchemeClass(scheme)).toBe("source-scheme-my_scheme");
    const out = styleSchemeCSS(scheme);
    expect(out).toContain(
      ".source-scheme-my_scheme > .gtk-border.left > .gtk-gutter { border-right: 1px solid #ff0000; }",
    );
    // update_current_line_color(): the view's color at 5%, over no background.
    expect(out).toContain(
      "--gtk-source-current-line: color-mix(in srgb, currentColor 5%, transparent);",
    );
    expect(out).toContain("--gtk-source-current-line-number-weight: normal;");
    // update_right_margin_colors(): no right-margin foreground: the view's color.
    expect(out).toContain(
      "--gtk-source-right-margin-line: color-mix(in srgb, currentColor 15.686%, transparent);",
    );
    expect(out).toContain(
      "--gtk-source-right-margin-overlay: color-mix(in srgb, #00ff00 5.882%, transparent);",
    );
    expect(out).not.toContain("caret-color");
  });

  test("every bundled scheme has a stylesheet", () => {
    for (const id of Object.keys(styleSchemes) as (keyof typeof styleSchemes)[]) {
      expect(css(id)).toContain(`--gtk-source-current-line:`);
    }
  });
});

describe("styleToCSS", () => {
  test("sets what gtk_source_style_apply() sets on a tag", () => {
    expect(
      styleToCSS({
        foreground: "#ff0000",
        background: "#00ff00",
        bold: true,
        italic: false,
        underline: "error",
        underlineColor: "red",
        strikethrough: true,
        scale: "x-large",
      }),
    ).toEqual({
      color: "#ff0000",
      backgroundColor: "#00ff00",
      fontWeight: "bold",
      fontStyle: "normal",
      textDecorationLine: "underline line-through",
      textDecorationStyle: "wavy",
      textDecorationColor: "red",
      fontSize: `${1.2 * 1.2}em`,
    });
    expect(styleToCSS({ weight: 600, bold: true, scale: "0.5" })).toEqual({
      fontWeight: "600",
      fontSize: "0.5em",
    });
  });
});
