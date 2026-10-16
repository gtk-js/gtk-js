// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import type { GtkSelectionMode } from "../types.ts";
import { GtkListBox, GtkListBoxRow } from "./list-box.tsx";

/** Which of three rows render as selected. */
function selection(
  selectionMode: GtkSelectionMode,
  selectedRows?: number[],
  unselectableRow?: number,
): boolean[] {
  const html = renderToStaticMarkup(
    <GtkListBox selectionMode={selectionMode} selectedRows={selectedRows}>
      {["A", "B", "C"].map((label, i) => (
        <GtkListBoxRow key={label} selectable={i !== unselectableRow}>
          {label}
        </GtkListBoxRow>
      ))}
    </GtkListBox>,
  );
  return [...html.matchAll(/aria-selected="(true|false)"/g)].map((m) => m[1] === "true");
}

describe("GtkListBox selectedRows", () => {
  test("multiple mode shows every selected row", () => {
    expect(selection("multiple", [0, 2])).toEqual([true, false, true]);
  });

  test("single and browse modes keep the last row, like gtk_list_box_select_row()", () => {
    expect(selection("single", [0, 2])).toEqual([false, false, true]);
    expect(selection("browse", [0, 2])).toEqual([false, false, true]);
  });

  test("none mode selects nothing", () => {
    expect(selection("none", [1])).toEqual([false, false, false]);
  });

  test("rows with selectable={false} are never selected", () => {
    expect(selection("multiple", [0, 2], 2)).toEqual([true, false, false]);
    // The last selectable row wins.
    expect(selection("single", [0, 2], 2)).toEqual([true, false, false]);
  });

  test("uncontrolled lists start unselected", () => {
    expect(selection("single")).toEqual([false, false, false]);
  });
});
