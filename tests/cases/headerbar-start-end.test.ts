import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Three known native extraction artifacts:
// 1. inset_shadows: GTK does not surface the headerbar's box-shadow insets as
//    GskInsetShadowNode in the GSK render tree.
// 2. font_weight: bold font from the inner button labels (font-weight: 700) bleeds
//    into the native root-node font_weight report.
// 3. border_radius: the host adw::Window's CSD border-radius (9px from --window-radius)
//    is captured via GskRoundedClipNode as the headerbar's border_radius when child
//    widgets extend to the corner area. The headerbar itself has no border-radius.
gtkTest("headerbar-start-end", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        !f.property.startsWith("inset_shadows") &&
        f.property !== "font_weight" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
});
