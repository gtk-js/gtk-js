import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("entry-flat", (native, web) => {
  // Flat entry has transparent background; WidgetPaintable picks up the window
  // background in CI's headless environment. Skip background_color per the known
  // limitation documented in tests/native/src/extract.rs.
  const result = compare({ ...native, background_color: null }, { ...web, background_color: null });
  if (result.failures.length > 0) {
    console.error("Failures:", JSON.stringify(result.failures, null, 2));
  }
  expect(result.failures).toEqual([]);
});
