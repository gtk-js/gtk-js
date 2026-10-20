import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

gtkTest("menu-button-circular-box", (native, web) => {
  // The theme draws on the button; the menubutton is only its container.
  const button = (tree: WidgetSnapshot) => findChild(tree, "button", 1);
  expect(compare(button(native), button(web)).failures).toEqual([]);

  // A menu button is as tall as its button (gtk_menu_button_measure()), so it
  // doesn't stretch the button next to it.
  expect(web.height).toBe(native.height);
  const [n, w] = [findChild(native, "menubutton"), findChild(web, "menubutton")];
  expect([w.x, w.y, w.width, w.height]).toEqual([n.x, n.y, n.width, n.height]);
  const [na, wa] = [findChild(native, "arrow"), findChild(web, "arrow")];
  expect([wa.x, wa.y]).toEqual([na.x, na.y]);
});
