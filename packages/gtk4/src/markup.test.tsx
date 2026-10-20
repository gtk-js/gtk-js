// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { labelText, parseMarkup } from "./markup.tsx";

const html = (markup: string, useUnderline = false) =>
  renderToStaticMarkup(<>{parseMarkup(markup, useUnderline)}</>);

describe("parseMarkup", () => {
  test("renders Pango's tags as styled spans and unescapes entities", () => {
    expect(html("Terms &amp; <b>Conditions</b>")).toBe(
      'Terms &amp; <span style="font-weight:bold">Conditions</span>',
    );
    expect(html("<i>a <tt>b</tt></i>")).toBe(
      '<span style="font-style:italic">a <span style="font-family:monospace">b</span></span>',
    );
    expect(html(`<span weight="light" foreground='#f00' size="x-large">c</span>`)).toBe(
      '<span style="font-weight:300;color:#f00;font-size:1.44em">c</span>',
    );
    expect(html("&#65;&#x42;&quot;")).toBe("AB&quot;");
  });

  test("returns null for markup that pango_parse_markup() rejects", () => {
    expect(parseMarkup("Tom & Jerry")).toBeNull();
    expect(parseMarkup("<b>unclosed")).toBeNull();
    expect(parseMarkup("<b>crossed</i>")).toBeNull();
    expect(parseMarkup("<script>alert(1)</script>")).toBeNull();
    expect(parseMarkup("a < b")).toBeNull();
  });

  test("hides mnemonic underscores like strip_ulines()", () => {
    expect(html("_Save <b>__as_</b>", true)).toBe(
      'Save <span style="font-weight:bold">_as_</span>',
    );
  });
});

describe("labelText", () => {
  test("shows text as it is without markup", () => {
    expect(labelText("<b>A</b> & B", false)).toBe("<b>A</b> & B");
    expect(labelText("_Open", false, true)).toBe("Open");
  });
});
