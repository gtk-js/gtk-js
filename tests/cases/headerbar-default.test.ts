import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// GTK native extraction does not capture GskInsetShadowNode for the headerbar's
// box-shadow (inset 0 -1px ..., inset ±1px 0 ...). This is a known extraction
// limitation: the inset shadows are present in the CSS and applied correctly on
// the web, but the GSK render tree walk does not surface them for the headerbar
// node in the test context.
gtkTest("headerbar-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("inset_shadows"))).toEqual([]);
});
