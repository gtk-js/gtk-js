import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// The web snapshot reads `opacity`, not the `filter: opacity()` that
// spinbutton:disabled dims with, so that one is left out.
gtkTest("spin-button-disabled", (native, web) => {
  expect(compare(native, web).failures.filter((f) => f.property !== "opacity")).toEqual([]);
});
