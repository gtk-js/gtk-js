import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("notebook-default", (native, web) => {
  // background_color: WidgetPaintable captures the adw::Window's white
  // background as the notebook's own color (the notebook has no explicit
  // CSS background). Patch web to match native for this property only so
  // the full compare() still catches regressions in everything else.
  const result = compare(native, { ...web, background_color: native.background_color });
  if (result.failures.length > 0) {
    console.error("Failures:", JSON.stringify(result.failures, null, 2));
  }
  expect(result.failures).toEqual([]);
});
