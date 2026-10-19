import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

gtkTest("menu-button-direction-none", (native, web) => {
  // The theme draws on the button; the menubutton is only its container.
  const button = (tree: WidgetSnapshot) => findChild(tree, "button", 0);
  expect(compare(button(native), button(web)).failures).toEqual([]);

  // A label hides an arrow that points nowhere (update_arrow()): the button
  // isn't an .arrow-button and is only as wide as its label.
  for (const tree of [native, web]) {
    expect(findChild(tree, "button").css_classes).not.toContain("arrow-button");
    expect(() => findChild(tree, "arrow")).toThrow();
  }
  expect(Math.abs(web.width - native.width)).toBeLessThan(5);
});
