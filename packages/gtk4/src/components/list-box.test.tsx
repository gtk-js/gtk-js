// Unit tests — no Playwright/cargo preload needed.

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import type { GtkSelectionMode } from "../types.ts";
import {
  GtkListBox,
  GtkListBoxRow,
  type GtkListBoxSelection,
  type GtkListBoxSelectionRules,
  selectAll,
  selectRow,
  unselectAll,
  unselectRow,
  updateSelection,
} from "./list-box.tsx";

/** The list's rows' opening tags. */
function rowTags(list: ReactNode): string[] {
  return renderToStaticMarkup(list).match(/<div role="listitem"[^>]*>/g) ?? [];
}

/** Which of three rows render as selected; null where a row has no selected state. */
function selection(
  selectionMode: GtkSelectionMode,
  selectedRows?: number[],
  unselectableRow?: number,
): (boolean | null)[] {
  return rowTags(
    <GtkListBox selectionMode={selectionMode} selectedRows={selectedRows}>
      {["A", "B", "C"].map((label, i) => (
        <GtkListBoxRow key={label} selectable={i !== unselectableRow}>
          {label}
        </GtkListBoxRow>
      ))}
    </GtkListBox>,
  ).map((tag) => {
    const selected = tag.match(/aria-selected="(true|false)"/)?.[1];
    return selected === undefined ? null : selected === "true";
  });
}

describe("GtkListBox selectedRows", () => {
  test("multiple mode shows every selected row", () => {
    expect(selection("multiple", [0, 2])).toEqual([true, false, true]);
  });

  test("single and browse modes keep the last row, like gtk_list_box_select_row()", () => {
    expect(selection("single", [0, 2])).toEqual([false, false, true]);
    expect(selection("browse", [0, 2])).toEqual([false, false, true]);
  });

  test("none mode selects nothing, and its rows have no selected state", () => {
    expect(selection("none", [1])).toEqual([null, null, null]);
  });

  test("rows with selectable={false} are never selected, and have no selected state", () => {
    expect(selection("multiple", [0, 2], 2)).toEqual([true, false, null]);
    // The last selectable row wins.
    expect(selection("single", [0, 2], 2)).toEqual([true, false, null]);
  });

  test("uncontrolled lists start unselected", () => {
    expect(selection("single")).toEqual([false, false, false]);
  });
});

describe("GtkListBoxRow focus", () => {
  test("every row is a Tab stop, like GTK_LIST_TAB_ALL", () => {
    const html = renderToStaticMarkup(
      <GtkListBox>
        <GtkListBoxRow>A</GtkListBoxRow>
        <GtkListBoxRow activatable={false} selectable={false}>
          B
        </GtkListBoxRow>
      </GtkListBox>,
    );
    expect(html.match(/tabindex="0"/g)).toHaveLength(2);
  });
});

describe("GtkListBoxRow", () => {
  test("shows tooltipText as a GTK tooltip", () => {
    const html = renderToStaticMarkup(
      <GtkListBox>
        <GtkListBoxRow tooltipText="Documents">A</GtkListBoxRow>
      </GtkListBox>,
    );
    expect(html).toContain('data-gtk-tooltip="Documents"');
    expect(html).toContain('aria-description="Documents"');
  });
});

describe("GtkListBox rows", () => {
  const classes = (tag: string) => (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");

  test("a selected row is :selected, not :checked", () => {
    const [tag] = rowTags(
      <GtkListBox selectedRows={[0]}>
        <GtkListBoxRow>A</GtkListBoxRow>
      </GtkListBox>,
    );
    expect(tag).toContain('aria-selected="true"');
    expect(tag).not.toContain("data-checked");
  });

  test("rows the list can select are .activatable too, like gtk_list_box_update_row()", () => {
    const activatable = (mode: GtkSelectionMode) =>
      rowTags(
        <GtkListBox selectionMode={mode}>
          <GtkListBoxRow>activatable</GtkListBoxRow>
          <GtkListBoxRow activatable={false}>selectable</GtkListBoxRow>
          <GtkListBoxRow activatable={false} selectable={false}>
            neither
          </GtkListBoxRow>
        </GtkListBox>,
      ).map((tag) => classes(tag).includes("activatable"));
    expect(activatable("single")).toEqual([true, true, false]);
    expect(activatable("none")).toEqual([true, false, false]);
  });

  test("only rows that are activatable themselves activate (gtk_list_box_activate())", () => {
    const tags = rowTags(
      <GtkListBox>
        <GtkListBoxRow>A</GtkListBoxRow>
        <GtkListBoxRow activatable={false}>B</GtkListBoxRow>
      </GtkListBox>,
    );
    expect(tags.map((tag) => tag.includes("data-gtk-activatable"))).toEqual([true, false]);
  });

  test("children that render nothing don't count", () => {
    const show = false as boolean;
    const tags = rowTags(
      <GtkListBox selectedRows={[1]}>
        {show && <GtkListBoxRow>hidden</GtkListBoxRow>}
        <GtkListBoxRow>A</GtkListBoxRow>
        <GtkListBoxRow>B</GtkListBoxRow>
      </GtkListBox>,
    );
    expect(tags.map((tag) => tag.match(/data-gtk-row-index="(\d+)"/)?.[1])).toEqual(["0", "1"]);
    expect(tags.map((tag) => tag.includes('aria-selected="true"'))).toEqual([false, true]);
  });

  test("the placeholder shows while no child renders", () => {
    const html = renderToStaticMarkup(
      <GtkListBox placeholder={<span>Empty</span>}>
        {false}
        {null}
      </GtkListBox>,
    );
    expect(html).toContain('<div class="gtk-placeholder"><span>Empty</span></div>');
  });

  test("text and DOM elements are put in rows, like gtk_list_box_insert()", () => {
    const html = renderToStaticMarkup(
      <GtkListBox>
        text<span>element</span>
        <GtkListBoxRow>row</GtkListBoxRow>
      </GtkListBox>,
    );
    expect(
      html
        .match(/<div role="listitem"[^>]*>(.*?)<\/div>/g)
        ?.map((row) => row.replace(/<div[^>]*>|<\/div>/g, "")),
    ).toEqual(["text", "<span>element</span>", "row"]);
  });
});

describe("GtkListBox disabled", () => {
  test("an insensitive row takes no focus or input", () => {
    const [tag] = rowTags(
      <GtkListBox>
        <GtkListBoxRow disabled>A</GtkListBoxRow>
      </GtkListBox>,
    );
    expect(tag).toContain('data-disabled="true"');
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).toContain('inert=""');
    expect(tag).not.toContain("tabindex");
  });

  test("an insensitive list makes its rows insensitive", () => {
    const html = renderToStaticMarkup(
      <GtkListBox disabled>
        <GtkListBoxRow>A</GtkListBoxRow>
      </GtkListBox>,
    );
    expect(html).toMatch(/^<div role="list"[^>]* data-disabled="true" inert=""/);
    expect(rowTags(<GtkListBox disabled>A</GtkListBox>)[0]).toContain('data-disabled="true"');
  });
});

describe("GtkListBox selection, like gtklistbox.c", () => {
  const rules = (
    mode: GtkSelectionMode,
    unselectable: number[] = [],
    count = 5,
  ): GtkListBoxSelectionRules => ({
    mode,
    count,
    selectable: (row) => row >= 0 && row < count && !unselectable.includes(row),
  });
  const sel = (rows: number[], anchor: number | null = null): GtkListBoxSelection => ({
    rows: new Set(rows),
    anchor,
  });
  const rowsOf = (selection: GtkListBoxSelection) => [...selection.rows].sort((a, b) => a - b);

  test("a single click adds its row and never toggles it (select_row_internal())", () => {
    const multiple = rules("multiple");
    const selection = selectRow(selectRow(sel([]), 0, multiple), 2, multiple);
    expect(rowsOf(selection)).toEqual([0, 2]);
    expect(selectRow(selection, 2, multiple)).toBe(selection);
    expect(rowsOf(selectRow(sel([0], 0), 2, rules("single")))).toEqual([2]);
    expect(selectRow(sel([]), 1, rules("single", [1])).rows.size).toBe(0);
  });

  test("clicks in double-click mode: plain, Shift and Ctrl (update_selection())", () => {
    const multiple = rules("multiple");
    let selection = updateSelection(sel([]), 0, multiple, false, false);
    selection = updateSelection(selection, 2, multiple, false, false);
    expect(rowsOf(selection)).toEqual([2]);
    selection = updateSelection(selection, 3, multiple, false, true);
    expect(rowsOf(selection)).toEqual([2, 3]);
    selection = updateSelection(selection, 0, multiple, true, false);
    expect(rowsOf(selection)).toEqual([0, 2, 3]);
    // Shift extends from the last row selected without it.
    selection = updateSelection(selection, 4, multiple, false, true);
    expect(rowsOf(selection)).toEqual([2, 3, 4]);
    selection = updateSelection(selection, 1, multiple, false, false);
    expect(rowsOf(selection)).toEqual([1]);
  });

  test("Ctrl unselects in single mode; browse mode keeps a row selected", () => {
    expect(rowsOf(updateSelection(sel([1], 1), 1, rules("single"), true, false))).toEqual([]);
    expect(rowsOf(updateSelection(sel([1], 1), 1, rules("browse"), true, false))).toEqual([1]);
    expect(rowsOf(unselectAll(sel([1], 1), rules("browse")))).toEqual([1]);
  });

  test("keys: moving selects just the new row, Shift extends, Ctrl+Space and Ctrl+A", () => {
    // native-lb-keys: rows 0 and 2 selected, cursor on 2.
    const multiple = rules("multiple");
    let selection = updateSelection(sel([0, 2], 2), 3, multiple, false, false);
    expect(rowsOf(selection)).toEqual([3]);
    selection = updateSelection(selection, 4, multiple, false, true);
    expect(rowsOf(selection)).toEqual([3, 4]);
    // Ctrl+Up moves the cursor to row 3 without selecting; Ctrl+Space unselects it.
    selection = unselectRow(selection, 3, multiple);
    expect(rowsOf(selection)).toEqual([4]);
    selection = selectAll(selection, multiple);
    expect(rowsOf(selection)).toEqual([0, 1, 2, 3, 4]);
    expect(rowsOf(unselectAll(selection, multiple))).toEqual([]);
    expect(selectAll(sel([1]), rules("single"))).toEqual(sel([1]));
  });

  test("ranges and Ctrl+A skip rows that can't be selected", () => {
    const multiple = rules("multiple", [1]);
    expect(rowsOf(updateSelection(sel([0], 0), 3, multiple, false, true))).toEqual([0, 2, 3]);
    expect(rowsOf(selectAll(sel([]), multiple))).toEqual([0, 2, 3, 4]);
  });
});
