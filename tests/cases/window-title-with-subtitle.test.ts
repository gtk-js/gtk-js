import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("window-title-with-subtitle", (native, web) => {
  // Native root picks up title label's font_weight=700 (child leakage — the root
  // windowtitle has no font_weight in GTK CSS). Skip at root, verify on label child.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "font_weight")).toEqual([]);

  // Title label (index 0) should be bold on both sides
  const nativeTitleLabel = findChild(native, "label", 0);
  const webTitleLabel = findChild(web, "label", 0);
  expect(
    compare(nativeTitleLabel, webTitleLabel).failures.filter((f) => f.property === "font_weight"),
  ).toEqual([]);

  // Subtitle label (index 1) exists here
  const nativeSubLabel = findChild(native, "label", 1);
  const webSubLabel = findChild(web, "label", 1);
  expect(compare(nativeSubLabel, webSubLabel).failures).toEqual([]);
});
