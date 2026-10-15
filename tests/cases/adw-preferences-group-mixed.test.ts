import { expect } from "bun:test";
import { gtkAssert } from "../assert";
import { gtkTest, type WidgetSnapshot } from "../harness";

/** The group's inner boxes: [header, box holding the list and other children]. */
function listboxBox(group: WidgetSnapshot): WidgetSnapshot {
  const box = group.children?.[0]?.children?.at(-1);
  expect(box?.css_name).toBe("box");
  return box!;
}

// Rows and labels added in turn, one row wrapped in an app component: the rows
// go in the list in order and the labels below it, in order.
gtkTest("adw-preferences-group-mixed", (native, web) => {
  const nativeBox = listboxBox(native);
  const webBox = listboxBox(web);
  const names = (box: WidgetSnapshot) => box.children?.map((child) => child.css_name);
  expect(names(nativeBox)).toEqual(["list", "label", "label"]);
  expect(names(webBox)).toEqual(names(nativeBox));

  // The first row (with a subtitle) and label are taller than the second
  // ones, so these sizes also check the order.
  const [nativeList, ...nativeLabels] = nativeBox.children!;
  const [webList, ...webLabels] = webBox.children!;
  const titles = (list: WidgetSnapshot) =>
    (list.children ?? []).map(
      (row) =>
        row.children?.[0]?.children?.find((box) => box.css_classes?.includes("title"))?.height,
    );
  expect(titles(nativeList!)).toEqual([36, 18]);
  expect(titles(webList!)).toEqual(titles(nativeList!));
  gtkAssert.numbersEqual(nativeList!.height, webList!.height, "list height");
  nativeLabels.forEach((label, i) => {
    gtkAssert.numbersEqual(label.y ?? Number.NaN, webLabels[i]!.y ?? Number.NaN, `label ${i} y`);
    gtkAssert.numbersEqual(label.height, webLabels[i]!.height, `label ${i} height`);
  });

  // The web group's height is fixed when it mounts, like a dialog's natural
  // size: the rows are already in the list then, so the group fits its box.
  const slack = (group: WidgetSnapshot) => group.height - group.children![0]!.height;
  gtkAssert.numbersEqual(slack(native), slack(web), "group height - box height");
});
