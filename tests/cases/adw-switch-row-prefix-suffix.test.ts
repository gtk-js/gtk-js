import { expect } from "vite-plus/test";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// Filtered: shadows — GtkSwitch slider box-shadow bleed (see adw-switch-row-default.test.ts).
//
// Also places the header's children like native: the prefixes and suffixes fill the
// header's height, the title box is centered, and the switch is the first suffix
// (adw_switch_row_init() adds it before any other). The native list is as wide as its
// test window, so the title's width and the suffixes' x aren't compared. Native sizes are
// content-box ones, web ones border-box.
gtkTest("adw-switch-row-prefix-suffix", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("shadows"))).toEqual([]);

  const parts = (list: WidgetSnapshot) => {
    const header = list.children?.[0]?.children?.[0];
    const [prefixes, title, suffixes] = header?.children ?? [];
    return {
      prefixes,
      image: prefixes?.children?.[0],
      title,
      suffixes,
      switch: suffixes?.children?.[0],
      button: suffixes?.children?.[1],
    };
  };
  const contentSize = (w: WidgetSnapshot) => ({
    width:
      w.width - w.padding.left - w.padding.right - w.border_widths.left - w.border_widths.right,
    height:
      w.height - w.padding.top - w.padding.bottom - w.border_widths.top - w.border_widths.bottom,
  });
  const skip: Partial<Record<string, string[]>> = { title: ["width"], suffixes: ["x"] };
  const n = parts(native);
  const w = parts(web);
  for (const key of Object.keys(n) as (keyof typeof n)[]) {
    const nn = n[key];
    const ww = w[key];
    expect(ww?.css_name, key).toBe(nn?.css_name);
    if (!nn || !ww) continue;
    const size = contentSize(ww);
    for (const [p, nv, wv] of [
      ["x", nn.x, ww.x],
      ["y", nn.y, ww.y],
      ["width", nn.width, size.width],
      ["height", nn.height, size.height],
    ] as const) {
      if (skip[key]?.includes(p)) continue;
      expect(wv, `${key}.${p}`).toBeCloseTo(nv ?? Number.NaN, 0);
    }
  }
});
