import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Native sizes are content-box ones, web ones border-box.
const outer = (n: WidgetSnapshot) => ({
  width: n.width + n.padding.left + n.padding.right + n.border_widths.left + n.border_widths.right,
  height:
    n.height + n.padding.top + n.padding.bottom + n.border_widths.top + n.border_widths.bottom,
});

gtkTest("notebook-tabs", (native, web) => {
  // As in notebook-default: native picks up the window's background.
  expect(compare(native, { ...web, background_color: native.background_color }).failures).toEqual(
    [],
  );

  // The header is one row of tabs, at their natural widths from the start
  // (gtk_notebook_allocate_tabs()).
  const header = { native: findChild(native, "header"), web: findChild(web, "header") };
  expect(header.web.height).toBeCloseTo(outer(header.native).height, 0);
  for (let i = 0; i < 3; i++) {
    const n = findChild(native, "tab", i);
    const w = findChild(web, "tab", i);
    expect([w.y, w.height]).toEqual([n.y, outer(n).height]);
    if (i === 0) expect(w.x).toBeCloseTo(n.x ?? 0, 0);
    else {
      // The gap after the previous tab (its margins), independent of text widths.
      const gap = (s: WidgetSnapshot, prev: WidgetSnapshot, width: number) =>
        (s.x ?? 0) - (prev.x ?? 0) - width;
      const pn = findChild(native, "tab", i - 1);
      const pw = findChild(web, "tab", i - 1);
      expect(gap(w, pw, pw.width)).toBeCloseTo(gap(n, pn, outer(pn).width), 0);
    }
  }

  // The stack fills the rest of the notebook (hexpand/vexpand in gtk_notebook_init()).
  const stack = { native: findChild(native, "stack"), web: findChild(web, "stack") };
  expect([stack.web.x, stack.web.y]).toEqual([stack.native.x, stack.native.y]);
  expect(stack.web.width).toBeCloseTo(stack.native.width, 0);
  expect(stack.web.height).toBeCloseTo(stack.native.height, 0);
});
