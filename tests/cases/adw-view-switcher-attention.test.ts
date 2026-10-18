import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** The icon's indicator bin in the button's visible (wide) box. */
function indicatorBin(tree: WidgetSnapshot, button: number): WidgetSnapshot {
  const stack = findChild(findChild(tree, "button", button), "stack");
  const box = stack.children?.find((c) => c.css_classes?.includes("wide"));
  if (!box) throw new Error("no box.wide in the stack");
  return findChild(box, "indicatorbin");
}

/** gtk_widget_get_width() / get_height() are the content box; the web snapshot measures the border box. */
function contentSize(w: WidgetSnapshot) {
  return {
    width:
      w.width - w.padding.left - w.padding.right - w.border_widths.left - w.border_widths.right,
    height:
      w.height - w.padding.top - w.padding.bottom - w.border_widths.top - w.border_widths.bottom,
  };
}

// AdwIndicatorBin puts the mask and the indicator, at the larger of their
// preferred sizes, over the icon's top end corner
// (adw_indicator_bin_size_allocate()).
gtkTest("adw-view-switcher-attention", (native, web) => {
  for (const [i, classes] of [
    [1, ["needs-attention"]],
    [2, ["needs-attention", "badge"]],
  ] as const) {
    const n = indicatorBin(native, i);
    const w = indicatorBin(web, i);
    for (const c of classes) expect(w.css_classes).toContain(c);
    for (const part of ["mask", "indicator"]) {
      const np = findChild(n, part);
      const wp = findChild(w, part);
      gtkAssert.numbersClose(
        np.x!,
        wp.x!,
        { tolerance: 1, reason: "CI's native libadwaita build places the mask 1px further left" },
        `button ${i} ${part} x`,
      );
      gtkAssert.numbersClose(
        np.y!,
        wp.y!,
        { tolerance: 1, reason: "CI's native libadwaita places the mask 1px further up" },
        `button ${i} ${part} y`,
      );
      gtkAssert.numbersEqual(np.height, contentSize(wp).height, `button ${i} ${part} height`);
    }
  }
  // The badge is accent-colored with needs-attention. (The dot's --accent-color
  // is an oklab() color, which the native snapshot reports as raw OKLab values.)
  gtkAssert.colorsEqual(
    findChild(indicatorBin(native, 2), "indicator").background_color,
    findChild(indicatorBin(web, 2), "indicator").background_color,
    "badge color",
  );
  // The badge is as wide as its label: "5" in bold 0.6rem.
  gtkAssert.numbersClose(
    findChild(indicatorBin(native, 2), "indicator").width,
    contentSize(findChild(indicatorBin(web, 2), "indicator")).width,
    { tolerance: 1, reason: "glyph widths, and rem against the browser's root font size" },
    "badge width",
  );
  gtkAssert.colorsEqual(
    findChild(findChild(indicatorBin(native, 2), "indicator"), "label").color,
    findChild(findChild(indicatorBin(web, 2), "indicator"), "label").color,
    "badge text color",
  );
});
