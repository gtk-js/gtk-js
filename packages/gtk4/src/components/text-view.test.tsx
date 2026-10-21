import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkTextView, textViewKeyAction } from "./text-view.tsx";

const view = { acceptsTab: true, editable: true, cursorVisible: true };
const key = (k: string, mods: { ctrl?: boolean; shift?: boolean } = {}) => ({
  key: k,
  ctrlKey: mods.ctrl ?? false,
  shiftKey: mods.shift ?? false,
  altKey: false,
  metaKey: false,
});

describe("GtkTextView key bindings", () => {
  test("Tab enters a tab in an editable view, else moves the focus", () => {
    expect(textViewKeyAction(key("Tab"), view)).toEqual({ type: "insert-tab" });
    expect(textViewKeyAction(key("Tab", { shift: true }), view)).toEqual({ type: "insert-tab" });
    expect(textViewKeyAction(key("Tab"), { ...view, editable: false })).toBeNull();
    expect(textViewKeyAction(key("Tab"), { ...view, acceptsTab: false })).toBeNull();
    expect(textViewKeyAction(key("Tab", { ctrl: true }), view)).toBeNull();
  });

  test("selects, unselects and deletes to the paragraph end", () => {
    expect(textViewKeyAction(key("/", { ctrl: true }), view)).toEqual({ type: "select-all" });
    expect(textViewKeyAction(key("a", { ctrl: true }), view)).toEqual({ type: "select-all" });
    expect(textViewKeyAction(key("\\", { ctrl: true }), view)).toEqual({ type: "unselect-all" });
    expect(textViewKeyAction(key("A", { ctrl: true, shift: true }), view)).toEqual({
      type: "unselect-all",
    });
    expect(textViewKeyAction(key("Delete", { ctrl: true, shift: true }), view)).toEqual({
      type: "delete-paragraph-end",
    });
    expect(textViewKeyAction(key("F7"), view)).toEqual({ type: "toggle-cursor-visible" });
  });

  test("movement keys scroll a view without a cursor", () => {
    const hidden = { ...view, cursorVisible: false };
    expect(textViewKeyAction(key("ArrowDown"), view)).toBeNull();
    expect(textViewKeyAction(key("ArrowDown"), hidden)).toEqual({
      type: "scroll",
      axis: "y",
      by: "step",
      count: 1,
    });
    expect(textViewKeyAction(key("ArrowLeft"), hidden)).toMatchObject({ axis: "x", count: -1 });
    expect(textViewKeyAction(key("PageUp"), hidden)).toMatchObject({ axis: "y", by: "page" });
    expect(textViewKeyAction(key("PageDown", { ctrl: true }), hidden)).toMatchObject({
      axis: "x",
      by: "page",
    });
    expect(textViewKeyAction(key("End"), hidden)).toMatchObject({ axis: "x", by: "end" });
    expect(textViewKeyAction(key("End", { ctrl: true }), hidden)).toMatchObject({
      axis: "y",
      by: "end",
      count: 1,
    });
  });
});

describe("GtkTextView", () => {
  test("a view that isn't editable keeps its cursor and shows no keyboard", () => {
    const html = renderToStaticMarkup(<GtkTextView editable={false} />);
    expect(html).not.toMatch(/\sreadonly/i);
    expect(html).toContain('aria-readonly="true"');
    expect(html).toMatch(/inputmode="none"/i);
  });

  test("maps the input purpose to the on-screen keyboard", () => {
    expect(renderToStaticMarkup(<GtkTextView inputPurpose="digits" />)).toMatch(
      /inputmode="numeric"/i,
    );
    expect(renderToStaticMarkup(<GtkTextView />)).not.toMatch(/inputmode/i);
  });

  test("wraps words whole and characters softly", () => {
    expect(renderToStaticMarkup(<GtkTextView wrapMode="word" />)).toContain("overflow-wrap:normal");
    expect(renderToStaticMarkup(<GtkTextView wrapMode="char" />)).toContain('wrap="soft"');
  });

  test("a negative indent indents the paragraph's other lines", () => {
    const html = renderToStaticMarkup(<GtkTextView indent={-16} leftMargin={16} />);
    expect(html).toContain("padding-left:32px");
    expect(html).toContain("--gtk-textview-indent:-16px");
  });

  test("puts gutters in border windows beside the text, and a layer under it", () => {
    const html = renderToStaticMarkup(
      <GtkTextView gutters={{ left: <span>1</span>, right: null }} belowText={<i />} />,
    );
    expect(html).toMatch(
      /^<div class="gtk-textview view"><div class="gtk-textview-layer" aria-hidden="true"><i><\/i><\/div><div class="gtk-textview-layer gtk-textview-text-layer" aria-hidden="true">[\s\S]*<\/div><textarea class="gtk-text"[^>]*><\/textarea><div class="gtk-border left"><span>1<\/span><\/div><\/div>$/,
    );
    // A gutter or layer drawn from the text's layout gets none on the server.
    const drawn = renderToStaticMarkup(
      <GtkTextView gutters={{ left: (layout) => String(layout) }} belowText={() => null} />,
    );
    expect(drawn).toContain('<div class="gtk-border left">null</div>');
    expect(drawn.match(/gtk-textview-layer/g)).toHaveLength(1);
  });

  test("lays each paragraph out in a block of its own, to draw the text", () => {
    const html = renderToStaticMarkup(
      <GtkTextView defaultValue={"one\n\nthree"} wrapMode="char" />,
    );
    expect(html).toContain(
      '<div class="gtk-textview-paragraphs" data-wrap="char" style="text-align:start;padding-left:0;padding-right:0;padding-top:0;padding-bottom:0"><div class="gtk-textview-paragraph"><div>one\n</div></div><div class="gtk-textview-paragraph"><div>\n</div></div><div class="gtk-textview-paragraph"><div>three\n</div></div></div>',
    );
    // Until it's laid out, the textarea draws its text itself.
    expect(html).not.toContain("data-gtk-drawn");
  });
});
