import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("toggle-icon", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);

  // A toggle button is a GtkButton: its icon is a GtkImage that spans the
  // content box's width, centered in its height (gtk_button_set_icon_name()).
  // The native button is as big as its test window; native sizes are
  // content-box ones, web ones border-box.
  const inset = (side: "top" | "right" | "bottom" | "left") =>
    web.padding[side] + web.border_widths[side];
  const contentBoxes = [
    [native, native.width, native.height],
    [web, web.width - inset("left") - inset("right"), web.height - inset("top") - inset("bottom")],
  ] as const;
  for (const [button, width, height] of contentBoxes) {
    const image = findChild(button, "image");
    expect([image.x, image.width, image.height]).toEqual([0, width, 16]);
    expect(image.y).toBeCloseTo((height - 16) / 2, 0);
  }
});
