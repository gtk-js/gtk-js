import { expect } from "bun:test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("button-icon", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);

  // GtkButton lays out its child with GtkBinLayout, and gives an icon child
  // valign=CENTER (gtk_button_set_icon_name()): the image spans the content
  // box's width and is centered in its height. The native button is as big as
  // its test window; native sizes are content-box ones, web ones border-box.
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
