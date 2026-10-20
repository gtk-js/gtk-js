import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// The start child gets the position, the handle its size and the end child
// the rest, and each child its whole pane, with no wrapper nodes
// (gtk_paned_size_allocate()). A lone child gets the whole paned and no handle.
gtkTest("paned-position", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const [nativeH, nativeV, nativeOnly] = native.children!;
  const [webH, webV, webOnly] = web.children!;
  // Native sizes are content sizes, web ones border-box sizes.
  const geometry = (n: WidgetSnapshot, w: WidgetSnapshot, label: string) => {
    expect(w.css_name, `${label} node`).toBe(n.css_name);
    gtkAssert.numbersEqual(n.x!, w.x!, `${label} x`);
    gtkAssert.numbersEqual(n.y!, w.y!, `${label} y`);
    const { padding: p, border_widths: b } = w;
    gtkAssert.numbersEqual(
      n.width,
      w.width - p.left - p.right - b.left - b.right,
      `${label} width`,
    );
    gtkAssert.numbersEqual(
      n.height,
      w.height - p.top - p.bottom - b.top - b.bottom,
      `${label} height`,
    );
  };
  for (const [n, w, label] of [
    [nativeH, webH, "horizontal"],
    [nativeV, webV, "vertical"],
  ] as const) {
    expect(w.children!.length, `${label} children`).toBe(3);
    n.children!.forEach((child, i) => geometry(child, w.children![i]!, `${label} child ${i}`));
  }
  // GTK keeps the hidden handle (child-visible=false), the web doesn't render it.
  expect(webOnly!.children!.length).toBe(1);
  geometry(nativeOnly!.children![0]!, webOnly!.children![0]!, "lone child");
});
