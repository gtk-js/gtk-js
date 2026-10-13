import { expect } from "bun:test";
import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

/** The children of preferencesgroup > box > box (the list's box). */
function listboxBoxChildren(group: WidgetSnapshot): WidgetSnapshot[] {
  const box = group.children?.[0]?.children?.at(-1);
  expect(box?.css_name).toBe("box");
  return box?.children ?? [];
}

// Without rows the list is hidden (update_listbox_visibility()): no empty card
// around the label.
gtkTest("adw-preferences-group-label-only", (native, web) => {
  const [nativeLabel, ...nativeRest] = listboxBoxChildren(native);
  const [webLabel, ...webRest] = listboxBoxChildren(web);
  expect([nativeLabel?.css_name, nativeRest.length]).toEqual(["label", 0]);
  expect([webLabel?.css_name, webRest.length]).toEqual(["label", 0]);
  gtkAssert.numbersEqual(nativeLabel!.y ?? Number.NaN, webLabel!.y ?? Number.NaN, "label y");
  gtkAssert.numbersEqual(nativeLabel!.height, webLabel!.height, "label height");
});
