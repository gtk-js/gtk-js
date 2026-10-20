import { expect } from "vite-plus/test";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

// Homogeneous children get equal columns, the spacing left out, like
// gtk_flow_box_size_allocate(). compare() leaves geometry out.
// Native sizes are content sizes (gtk_widget_get_width()), web ones border-box.
// Text widths differ a little between browsers, so allow a few pixels.
const geometry = (tree: WidgetSnapshot, web = false) =>
  (tree.children ?? []).map(
    ({ css_name, x = 0, y = 0, width, height, padding, border_widths: b }) => ({
      css_name,
      box: [
        x,
        y,
        web ? width - padding.left - padding.right - b.left - b.right : width,
        web ? height - padding.top - padding.bottom - b.top - b.bottom : height,
      ],
    }),
  );

gtkTest("flow-box-homogeneous", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  expect(Math.abs(web.width - native.width)).toBeLessThanOrEqual(4);
  expect(Math.abs(web.height - native.height)).toBeLessThanOrEqual(4);
  const n = geometry(native);
  const w = geometry(web, true);
  expect(w.map((c) => c.css_name)).toEqual(n.map((c) => c.css_name));
  w.forEach((child, i) =>
    child.box.forEach((v, j) => expect(Math.abs(v - n[i]!.box[j]!)).toBeLessThanOrEqual(4)),
  );
});
