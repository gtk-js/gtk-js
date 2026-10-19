import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// Baseline-aligned children share a baseline at the bottom of the taller box
// (baseline-position=bottom, gtk_center_layout_allocate()).
gtkTest("center-box-baseline-bottom", (native, web) => {
  // The buttons' background, radius and bold text bleed into the native root
  // node's report (see actionbar-default).
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius") &&
        f.property !== "font_weight",
    ),
  ).toEqual([]);
  const [nLabel, nButton] = native.children ?? [];
  const [wLabel, wButton] = web.children ?? [];
  gtkAssert.numbersClose(
    nLabel.y ?? Number.NaN,
    wLabel.y ?? Number.NaN,
    { tolerance: 1.5, reason: "the browser and Pango round the text's baseline differently" },
    "label y",
  );
  gtkAssert.numbersEqual(nButton.y ?? Number.NaN, wButton.y ?? Number.NaN, "button y");
});
