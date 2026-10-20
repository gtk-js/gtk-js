import { expect } from "vite-plus/test";
import { compare, gtkTest, type WidgetSnapshot } from "../harness";

function button(tree: WidgetSnapshot, cssClass: string): WidgetSnapshot {
  const node = tree.children?.find(
    (child) => child.css_name === "button" && child.css_classes?.includes(cssClass),
  );
  if (!node) throw new Error(`button.${cssClass} not found`);
  return node;
}

// The theme only sets `border-style: solid` and `border-left-width: 1px` on
// the buttons (_spin-button.scss), relying on GTK's initial border width of 0.
gtkTest("spin-button-default", (native, web) => {
  for (const cssClass of ["down", "up"]) {
    const nativeButton = button(native, cssClass);
    const webButton = button(web, cssClass);
    expect(webButton.border_widths).toEqual(nativeButton.border_widths);
    expect(compare(nativeButton, webButton).failures).toEqual([]);
  }
});
