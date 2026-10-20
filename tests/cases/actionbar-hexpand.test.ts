import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// With no center widget, the expanding start box takes all the room up to the
// end box (gtk_center_layout_distribute()).
gtkTest("actionbar-hexpand", (native, web) => {
  // The buttons' background, radius and bold text bleed into the native root
  // node's report (see actionbar-default).
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius") &&
        f.property !== "font_weight",
    ),
  ).toEqual([]);
  const nBox = native.children?.[0]?.children?.[0];
  const wBox = web.children?.[0]?.children?.[0];
  const [nStart, nEnd] = nBox?.children ?? [];
  const [wStart, wEnd] = wBox?.children ?? [];
  gtkAssert.numbersEqual(
    (nEnd.x ?? Number.NaN) - nStart.width,
    (wEnd.x ?? Number.NaN) - wStart.width,
    "start box to end box",
  );
});
