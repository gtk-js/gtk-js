import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Two known native extraction artifacts:
// 1. inset_shadows: GTK does not surface the headerbar's box-shadow insets as
//    GskInsetShadowNode in the GSK render tree (same as headerbar-default).
// 2. font_weight: the bold font from the inner WindowTitle label (font-weight: 700)
//    bleeds into the native extraction's root-node font_weight report. The web
//    extraction reads the outer headerbar div's computed font-weight (400, inherited).
gtkTest("headerbar-with-title", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter((f) => !f.property.startsWith("inset_shadows") && f.property !== "font_weight"),
  ).toEqual([]);
});
