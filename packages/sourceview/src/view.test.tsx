import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkSourceView } from "./view.tsx";

const markup = (element: React.ReactElement) =>
  // The stylesheets React hoists come first.
  renderToStaticMarkup(element).replace(/^<style[^>]*>[\s\S]*?<\/style>/, "");

describe("GtkSourceView", () => {
  test("is a text view with the GtkSourceView and sourceview classes and the buffer's scheme", () => {
    const html = markup(<GtkSourceView monospace />);
    expect(html).toMatch(
      /^<div class="gtk-textview view monospace GtkSourceView sourceview source-scheme-classic" style="tab-size:8">/,
    );
    // GtkSourceView sets 2px left and right margins (gtk_source_view_init()).
    expect(html).toContain("padding-left:2px;padding-right:2px");
    expect(html).not.toContain("gtk-border");
    expect(markup(<GtkSourceView styleScheme={null} />)).not.toContain("source-scheme");
  });

  test("shows line numbers in a gutter in the left border window", () => {
    const html = markup(<GtkSourceView defaultValue={"a\nb\nc"} showLineNumbers />);
    expect(html).toContain(
      '<div class="gtk-border left"><div class="gtk-gutter"><div class="gtk-gutterrenderer" style="width:calc(round(up, 2ch, 1px) + 12px);padding-top:0;padding-bottom:0"><div data-line="0" data-cursor-line="true" data-bold="true">1</div><div data-line="1">2</div><div data-line="2">3</div></div></div></div>',
    );
    // Room for as many digits as the last line's number has, at least two.
    const long = Array.from({ length: 120 }, () => "").join("\n");
    expect(markup(<GtkSourceView defaultValue={long} showLineNumbers />)).toContain(
      "width:calc(round(up, 3ch, 1px) + 12px)",
    );
  });

  test("highlights the cursor's line, in the text and the gutter", () => {
    const html = markup(
      <GtkSourceView defaultValue={"a\nb"} showLineNumbers highlightCurrentLine />,
    );
    expect(html).toContain('<div class="gtk-source-gutter-current-line"');
    expect(html).toContain('<div class="gtk-source-line" data-current-line="true"');
    // Not while insensitive (gtk_source_view_snapshot_layer()).
    expect(markup(<GtkSourceView highlightCurrentLine disabled />)).not.toContain(
      "data-current-line",
    );
  });

  test("measures its tab stops and right margin, drawn under the text", () => {
    const html = markup(
      <GtkSourceView
        defaultValue={"x\n\ty"}
        tabWidth={4}
        showRightMargin
        rightMarginPosition={5}
        wrapMode="word"
      />,
    );
    // Measured for whole-pixel tab stops and margin once rendered.
    expect(html).toContain('style="tab-size:4"');
    expect(html).toContain('<span class="gtk-source-measure">    </span>');
    expect(html).toContain('<span class="gtk-source-measure">_____</span>');
    expect(html).toContain(
      '<div class="gtk-source-right-margin-overlay" style="left:calc(2px + round(up, 5ch, 1px))"></div><div class="gtk-source-right-margin" style="left:calc(2px + round(up, 5ch, 1px))"></div><div class="gtk-source-lines" data-right-margin="" style="--gtk-source-right-margin-x:calc(2px + round(up, 5ch, 1px))"></div>',
    );
  });

  test("draws the current line from where the text's paragraphs are", () => {
    // On the server, a row per line.
    const html = markup(<GtkSourceView defaultValue={"a\nb"} highlightCurrentLine />);
    expect(html).toContain(
      '<div class="gtk-source-line" data-current-line="true" style="top:calc(0px + 0 * var(--gtk-textview-line-height, round(1lh, 1px)));height:var(--gtk-textview-line-height, round(1lh, 1px))"></div>',
    );
  });

  test("follows the value", () => {
    const html = markup(<GtkSourceView value={"1\n2\n3\n4"} showLineNumbers />);
    expect(html.match(/data-line=/g)).toHaveLength(4);
  });
});
