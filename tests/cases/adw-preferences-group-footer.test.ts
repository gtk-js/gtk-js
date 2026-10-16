import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

/** The group's inner boxes: [header, box holding the list and other children]. */
function listboxBox(group: WidgetSnapshot): WidgetSnapshot {
  const box = group.children?.[0]?.children?.at(-1);
  expect(box?.css_name).toBe("box");
  return box!;
}

// adw_preferences_group_add() appends rows to the list and other widgets to
// the box around it, so the label sits below the list, not in it.
gtkTest("adw-preferences-group-footer", (native, web) => {
  const nativeBox = listboxBox(native);
  const webBox = listboxBox(web);
  const names = (box: WidgetSnapshot) => box.children?.map((child) => child.css_name);
  expect(names(nativeBox)).toEqual(["list", "label"]);
  expect(names(webBox)).toEqual(names(nativeBox));

  const [nativeList, nativeLabel] = nativeBox.children!;
  const [webList, webLabel] = webBox.children!;
  gtkAssert.numbersEqual(nativeList!.height, webList!.height, "list height");
  gtkAssert.numbersEqual(nativeLabel!.y ?? Number.NaN, webLabel!.y ?? Number.NaN, "label y");
  gtkAssert.numbersEqual(nativeLabel!.height, webLabel!.height, "label height");
});
