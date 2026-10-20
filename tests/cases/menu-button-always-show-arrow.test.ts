import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

gtkTest("menu-button-always-show-arrow", (native, web) => {
  // The theme draws on the button; the menubutton is only its container.
  const button = (tree: WidgetSnapshot) => findChild(tree, "button", 0);
  expect(compare(button(native), button(web)).failures).toEqual([]);

  // The icon and the arrow sit side by side in a centered box
  // (gtk_menu_button_set_icon_name()), not on top of each other.
  expect(web.width).toBe(native.width);
  for (const name of ["box", "image", "arrow"]) {
    const [n, w] = [findChild(native, name), findChild(web, name)];
    expect([w.x, w.y, w.width, w.height], name).toEqual([n.x, n.y, n.width, n.height]);
  }
});
