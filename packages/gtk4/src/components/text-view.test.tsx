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
    expect(html).toContain("data-text-windows");
    expect(html).toMatch(
      /<div class="gtk-textview-layer" aria-hidden="true"><i><\/i><\/div><textarea class="gtk-text"[^>]*><\/textarea><div class="gtk-border left"><span>1<\/span><\/div><\/div>$/,
    );
    expect(renderToStaticMarkup(<GtkTextView />)).not.toContain("data-text-windows");
  });
});
