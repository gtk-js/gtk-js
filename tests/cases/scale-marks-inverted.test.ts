import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { findChild, gtkTest, type WidgetSnapshot } from "../harness";

/** css_classes without gtk-js's node-name class. */
function classes(s: WidgetSnapshot): string[] {
  return (s.css_classes ?? []).filter((c) => !c.startsWith("gtk-")).sort();
}

/** A node's center along x, in its parent's content box. */
function centerX(s: WidgetSnapshot): number {
  return (s.x ?? 0) + s.width / 2;
}

// marks.top and marks.bottom sit against the trough, each mark centered where the
// slider's center would be at its value (reversed when inverted); the inverted
// highlight runs from the slider to the end.
gtkTest("scale-marks-inverted", (native, web) => {
  expect(classes(web)).toEqual(classes(native));
  const nodes = (s: WidgetSnapshot) =>
    (s.children ?? []).map((c) => [c.css_name, ...classes(c)].join("."));
  expect(nodes(web)).toEqual(nodes(native));
  gtkAssert.numbersEqual(
    native.height,
    web.height - web.padding.top - web.padding.bottom,
    "height",
  );

  for (const name of ["trough", "highlight", "slider"]) {
    const n = findChild(native, name);
    const w = findChild(web, name);
    expect(classes(w)).toEqual(classes(n));
    for (const key of ["x", "y", "width", "height"] as const) {
      gtkAssert.numbersEqual(n[key] ?? 0, w[key] ?? 0, `${name} ${key}`);
    }
  }
  for (const index of [0, 1]) {
    const n = findChild(native, "marks", index);
    const w = findChild(web, "marks", index);
    gtkAssert.numbersEqual(n.y ?? 0, w.y ?? 0, `marks ${index} y`);
    gtkAssert.numbersEqual(n.height, w.height, `marks ${index} height`);
    expect(w.children?.length).toBe(n.children?.length);
    (n.children ?? []).forEach((nativeMark, i) => {
      const webMark = w.children![i];
      expect(webMark.children?.map((c) => c.css_name)).toEqual(
        nativeMark.children?.map((c) => c.css_name),
      );
      // Label widths differ by a few pixels between browsers; centers don't.
      gtkAssert.numbersClose(
        centerX(nativeMark),
        centerX(webMark),
        { tolerance: 1, reason: "GTK rounds the mark's x to whole pixels" },
        `marks ${index} mark ${i} center`,
      );
      const nativeIndicator = findChild(nativeMark, "indicator");
      const webIndicator = findChild(webMark, "indicator");
      gtkAssert.numbersEqual(nativeIndicator.y ?? 0, webIndicator.y ?? 0, "indicator y");
      gtkAssert.numbersEqual(nativeIndicator.height, webIndicator.height, "indicator height");
    });
  }
});
