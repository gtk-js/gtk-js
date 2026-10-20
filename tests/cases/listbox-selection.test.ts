import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Rows the list can select are .activatable even when they aren't activatable
// themselves (gtk_list_box_update_row()), and the selected row is :selected.
gtkTest("listbox-selection", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const nativeRows = native.children ?? [];
  expect(web.children?.length).toBe(nativeRows.length);
  nativeRows.forEach((row, i) => {
    const webRow = web.children![i]!;
    expect(webRow.css_classes?.includes("activatable"), `row ${i} .activatable`).toBe(
      (row.css_classes ?? []).includes("activatable"),
    );
    expect(compare(row, webRow).failures).toEqual([]);
  });
});
