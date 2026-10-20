import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vite-plus/test";
import { GtkButton } from "./button.tsx";
import { GtkGrid, type GtkGridChildProps } from "./grid.tsx";

const at = (placement: GtkGridChildProps) => placement;

describe("GtkGrid", () => {
  test("places children as grid items, without leaking placement props to the DOM", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const html = renderToStaticMarkup(
      <GtkGrid columnHomogeneous>
        <GtkButton label="1" {...at({ column: 1, row: 1 })} />
        <GtkButton label="2" {...at({ column: 2, row: 1 })} />
        <GtkButton label="3" {...at({ column: 1, row: 2, columnSpan: 2 })} />
      </GtkGrid>,
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
    // Lines start at the first one used; the buttons are the grid's children.
    expect(html).toMatch(/^<div class="gtk-grid gtk-grid-layout" style="[^"]*repeat\(2, 1fr\)/);
    expect(html).toMatch(/<button[^>]* style="grid-column:1 \/ span 1;grid-row:1 \/ span 1"/);
    expect(html).toMatch(/<button[^>]* style="grid-column:1 \/ span 2;grid-row:2 \/ span 1"/);
    expect(html).not.toMatch(/column=|row=|columnspan/i);
  });
});
