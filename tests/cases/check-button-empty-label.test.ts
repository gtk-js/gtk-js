import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("check-button-empty-label", (native, web) => {
  // Native root picks up check indicator's inset box-shadow (child leakage —
  // box-shadow: inset 0 0 0 2px on the check/radio indicator, not the root).
  // An empty label is no label (gtk_check_button_set_label()): no .text-button
  // padding, which compare() checks, and no label child.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("inset_shadows"))).toEqual([]);
  expect(web.children?.map((c) => c.css_name)).toEqual(native.children?.map((c) => c.css_name));
});
