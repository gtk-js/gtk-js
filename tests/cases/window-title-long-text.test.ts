import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("window-title-long-text", (native, web) => {
  // Native root picks up title label's font_weight=700 (child leakage — the root
  // windowtitle has no font_weight in GTK CSS). Skip at root, verify on label child.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "font_weight")).toEqual([]);

  const nativeLabel = findChild(native, "label");
  const webLabel = findChild(web, "label");
  expect(
    compare(nativeLabel, webLabel).failures.filter((f) => f.property === "font_weight"),
  ).toEqual([]);
});
