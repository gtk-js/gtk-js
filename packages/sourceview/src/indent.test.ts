import { describe, expect, test } from "vite-plus/test";
import {
  applyEdits,
  autoIndentNewline,
  indentLines,
  insertTabOrSpaces,
  mapOffset,
  unindentLines,
} from "./indent.ts";

const tabs = { tabWidth: 8, indentWidth: -1, insertSpaces: false };
const spaces4 = { tabWidth: 8, indentWidth: 4, insertSpaces: true };

describe("indentation", () => {
  test("Tab inserts a tab, or spaces to the next indentation stop", () => {
    expect(insertTabOrSpaces("ab", 1, 1, tabs)).toEqual({ edit: { from: 1, to: 1, insert: "\t" } });
    expect(insertTabOrSpaces("ab", 1, 1, spaces4).edit.insert).toBe("   ");
    expect(insertTabOrSpaces("\tab", 1, 1, spaces4).edit.insert).toBe("    ");
    // A selection within a line is replaced.
    expect(insertTabOrSpaces("abcd", 1, 3, tabs).edit).toEqual({ from: 1, to: 3, insert: "\t" });
  });

  test("an indent width under the tab width mixes tabs and spaces", () => {
    const mixed = { tabWidth: 8, indentWidth: 4, insertSpaces: false };
    expect(insertTabOrSpaces("x", 0, 0, mixed)).toEqual({
      edit: { from: 0, to: 0, insert: "    " },
      cursor: 4,
    });
    // Two levels become a tab.
    expect(insertTabOrSpaces("    x", 4, 4, mixed)).toEqual({
      edit: { from: 0, to: 4, insert: "\t" },
      cursor: 1,
    });
  });

  test("indents and unindents whole lines, but not empty ones", () => {
    const text = "a\n\n  b\nc";
    const edits = indentLines(text, 0, text.length, tabs);
    expect(applyEdits(text, edits)).toBe("\ta\n\n\t  b\n\tc");
    expect(applyEdits(text, indentLines(text, 0, text.length, spaces4))).toBe(
      "    a\n\n      b\n    c",
    );
    expect(
      applyEdits("\t\ta\n    b\n  c", unindentLines("\t\ta\n    b\n  c", 0, 13, spaces4)),
    ).toBe("\ta\nb\nc");
    // A selection ending at a line's start leaves that line be.
    expect(applyEdits("a\nb", indentLines("a\nb", 0, 2, tabs))).toBe("\ta\nb");
  });

  test("Enter copies the line's indentation", () => {
    const text = "\t  foo  bar";
    const edit = autoIndentNewline(text, 6, 6)!;
    expect(applyEdits(text, [edit])).toBe("\t  foo\n\t  bar");
    expect(autoIndentNewline(text, 0, 0)).toBeNull();
    expect(autoIndentNewline(text, 1, 3)).toBeNull();
  });

  test("the selection follows the edits like marks with right gravity", () => {
    const edits = indentLines("a\nb", 0, 3, tabs);
    expect(mapOffset(0, edits)).toBe(1);
    expect(mapOffset(3, edits)).toBe(5);
  });
});
