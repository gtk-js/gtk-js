import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("editable-label-editing-active", (native, web) => {
  // Native root picks up the text entry's white background_color (child leakage via
  // editablelabel > stack > text { background-color: var(--view-bg-color) }).
  // The root editablelabel has no background in GTK CSS. Skip at root.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
});
