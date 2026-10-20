// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import type { GtkSelectionMode } from "../types.ts";
import {
  type FlowBoxSelection,
  flowBoxMeasure,
  flowBoxTracks,
  GtkFlowBox,
  GtkFlowBoxChild,
  type GtkRequestedSize,
  selectChild,
  updateSelection,
} from "./flow-box.tsx";
import { GtkLabel } from "./label.tsx";

/** Children whose minimum and natural sizes are the same. */
const sized = (...sizes: number[]): GtkRequestedSize[] =>
  sizes.map((size) => ({ minimum: size, natural: size }));

// The natural widths of flowboxchilds holding labels "A", "Bravo", "Charlie
// charlie", "D", "Echo", "Foxtrot" and "G" in native GTK 4.22.
const words = sized(16, 44, 100, 17, 39, 54, 16);
const options = { spacing: 0, homogeneous: false, minChildrenPerLine: 0, maxChildrenPerLine: 7 };

describe("GtkFlowBox layout, like gtk_flow_box_size_allocate()", () => {
  test("aligned columns share the space left equally", () => {
    // Native: 18 46 102 19 41 56 18 at 300px.
    expect(flowBoxTracks(words, 300, options)).toEqual([18, 46, 102, 19, 41, 56, 18]);
  });

  test("a line holds as many children as fit in aligned columns", () => {
    // Native: one child per line at 150px; two would need 100 + 54.
    expect(flowBoxTracks(words, 150, options)).toEqual([150]);
    // The docs example: 4 columns at 300px with 8px spacing, the extra pixels
    // going to the first columns.
    const colors = sized(39, 64, 36, 51, 38, 63);
    expect(flowBoxTracks(colors, 300, { ...options, spacing: 8, maxChildrenPerLine: 4 })).toEqual([
      61, 86, 57, 72,
    ]);
  });

  test("min and max children per line", () => {
    const three = { ...options, minChildrenPerLine: 3, maxChildrenPerLine: 3 };
    // Native: 64 90 146 at 300px, and a flow box that grows to 161px at 150px.
    expect(flowBoxTracks(words, 300, three)).toEqual([64, 90, 146]);
    expect(flowBoxMeasure(words, false, three).minimum).toBe(161);
  });

  test("empty columns up to max-children-per-line take their share too", () => {
    expect(flowBoxTracks(sized(40, 40, 40, 40), 300, options)).toEqual([
      60, 60, 60, 60, 20, 20, 20,
    ]);
  });

  test("homogeneous children get equal columns, spacing left out", () => {
    // Native: 2 columns of 147px at 300px with 6px spacing.
    const homogeneous = { ...options, homogeneous: true, spacing: 6, maxChildrenPerLine: 3 };
    expect(flowBoxTracks(words, 300, homogeneous)).toEqual([147, 147]);
  });

  test("the size request, like gtk_flow_box_measure()", () => {
    // Natural: max-children-per-line aligned columns; minimum: one column.
    expect(flowBoxMeasure(words, false, options)).toEqual({ minimum: 100, natural: 286 });
    expect(flowBoxMeasure(sized(10, 20), false, { ...options, spacing: 5 })).toEqual({
      minimum: 20,
      natural: 60,
    });
    // A vertical flow box asks for its tallest child only, so it lays its
    // children out in one row.
    expect(flowBoxMeasure(sized(24, 24, 24), true, options)).toEqual({
      minimum: 24,
      natural: 24,
    });
  });
});

describe("GtkFlowBox selection", () => {
  const none: FlowBoxSelection = { selected: new Set(), anchor: null };
  const list = ({ selected }: FlowBoxSelection) => [...selected].sort();

  test("clicks in double-click mode: plain, Shift and Ctrl (gtk_flow_box_update_selection())", () => {
    const multiple = (s: FlowBoxSelection, i: number, modify = false, extend = false) =>
      updateSelection("multiple", s, i, modify, extend);
    const a = multiple(multiple(none, 0), 2);
    expect(list(a)).toEqual([2]);
    const b = multiple(a, 3, false, true);
    expect(list(b)).toEqual([2, 3]);
    const c = multiple(b, 0, true);
    expect(list(c)).toEqual([0, 2, 3]);
    // Shift extends from the last child selected without it.
    expect(list(multiple(c, 1, false, true))).toEqual([1, 2]);
    // Ctrl unselects in single mode.
    const single = updateSelection("single", none, 1, false, false);
    expect(list(updateSelection("single", single, 1, true, false))).toEqual([]);
  });

  test("activating only ever adds to the selection (gtk_flow_box_select_child_internal())", () => {
    const one = selectChild("multiple", none, 1);
    expect(list(selectChild("multiple", one, 1))).toEqual([1]);
    expect(list(selectChild("multiple", one, 2))).toEqual([1, 2]);
    expect(list(selectChild("single", one, 2))).toEqual([2]);
    expect(list(selectChild("none", none, 2))).toEqual([]);
  });
});

/** Which of three children render as selected. */
function selection(selectionMode: GtkSelectionMode, selectedChildren?: number[]): boolean[] {
  const html = renderToStaticMarkup(
    <GtkFlowBox selectionMode={selectionMode} selectedChildren={selectedChildren}>
      <GtkFlowBoxChild>A</GtkFlowBoxChild>
      <GtkFlowBoxChild>B</GtkFlowBoxChild>
      <GtkFlowBoxChild>C</GtkFlowBoxChild>
    </GtkFlowBox>,
  );
  return [...html.matchAll(/aria-selected="(true|false)"/g)].map((m) => m[1] === "true");
}

describe("GtkFlowBox children", () => {
  test("flowboxchilds are the flow box's own children, like the CSS node tree", () => {
    const html = renderToStaticMarkup(
      <GtkFlowBox>
        <GtkFlowBoxChild>A</GtkFlowBoxChild>
      </GtkFlowBox>,
    );
    expect(html).toMatch(
      /^<div role="grid" class="gtk-flowbox horizontal"[^>]*><div role="gridcell"/,
    );
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain("data-checked");
  });

  test("other children are put in a flowboxchild, like gtk_flow_box_insert()", () => {
    const html = renderToStaticMarkup(
      <GtkFlowBox orientation="vertical">
        <GtkLabel label="A" />
        {false}
        <GtkFlowBoxChild>B</GtkFlowBoxChild>
      </GtkFlowBox>,
    );
    expect(html).toContain('class="gtk-flowbox vertical"');
    expect(html.match(/class="gtk-flowboxchild/g)).toHaveLength(2);
    expect(html).toMatch(/class="gtk-flowboxchild[^"]*"[^>]*><span[^>]*class="gtk-label/);
  });

  test("selectedChildren shows the selection, as the mode allows", () => {
    expect(selection("multiple", [0, 2])).toEqual([true, false, true]);
    expect(selection("single", [0, 2])).toEqual([false, false, true]);
    expect(selection("none", [1])).toEqual([false, false, false]);
    expect(selection("single")).toEqual([false, false, false]);
  });

  test("insensitive children and flow boxes can't take focus", () => {
    const html = renderToStaticMarkup(
      <GtkFlowBox>
        <GtkFlowBoxChild disabled>A</GtkFlowBoxChild>
        <GtkFlowBoxChild>B</GtkFlowBoxChild>
      </GtkFlowBox>,
    );
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/data-disabled/g)).toHaveLength(1);
    const disabled = renderToStaticMarkup(
      <GtkFlowBox disabled>
        <GtkFlowBoxChild>A</GtkFlowBoxChild>
        <GtkFlowBoxChild>B</GtkFlowBoxChild>
      </GtkFlowBox>,
    );
    expect(disabled).not.toContain("tabindex");
    expect(disabled.match(/data-disabled/g)).toHaveLength(3);
  });
});
