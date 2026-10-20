import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// Widgets that aren't rows are put in one, like gtk_list_box_insert(). No
// selection: the native window's first focus would select the first row.
gtkTest("listbox-bare-labels", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const nativeRows = native.children ?? [];
  const webRows = web.children ?? [];
  expect(nativeRows.map((row) => row.css_name)).toEqual(["row", "row", "row"]);
  expect(webRows.map((row) => row.css_name)).toEqual(["row", "row", "row"]);
  nativeRows.forEach((row, i) => {
    const webRow = webRows[i]!;
    expect(compare(row, webRow).failures).toEqual([]);
    // A row's height isn't in the native snapshot (it draws nothing), its y is.
    gtkAssert.numbersEqual(row.y ?? Number.NaN, webRow.y ?? Number.NaN, `row ${i} y`);
    expect(webRow.css_classes).toContain("activatable");
    expect(webRow.children?.map((child) => child.css_name)).toEqual(["label"]);
  });
});
