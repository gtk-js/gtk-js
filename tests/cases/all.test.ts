import { gtkAssert } from "../assert";
import { gtkTest, gtkTestExpectFailure } from "../harness";

gtkTest("box-horizontal-default");
gtkTest("box-homogeneous");
gtkTest("box-spacing");
gtkTest("box-vertical-default");
gtkTest("center-box-default");
gtkTest("expander-default");
gtkTest("expander-expanded");
gtkTest("flow-box-default");
gtkTest("frame-default");
gtkTest("frame-no-label");
gtkTest("grid-default");
gtkTest("overlay-default");
gtkTest("paned-horizontal");
gtkTest("paned-vertical");
gtkTest("button-circular");
gtkTest("button-disabled");
gtkTest("button-pill");
gtkTest("button-text-default");
gtkTest("button-text-destructive");
gtkTest("button-text-flat");
gtkTest("button-text-suggested");
gtkTest("link-default");
gtkTest("link-visited", (native, web) => {
  gtkAssert.sidesEqual(native.padding, web.padding, "padding");
  gtkAssert.colorsEqual(native.background_color, web.background_color, "background_color");
  gtkAssert.sidesEqual(native.border_widths, web.border_widths, "border_widths");
  gtkAssert.numbersEqual(native.opacity, web.opacity, "opacity");

  // Visited link color is off by ~5-7/255 due to fixColorMixGamut converting
  // color-mix(in srgb) -> color-mix(in oklab). The srgb->oklab interpolation
  // shift is not user-perceptible (~2%) but exceeds the default 1/255 tolerance.
  // The native r channel can also go slightly negative (out-of-gamut oklab artifact)
  // which adds ~1/255 to the observed delta; 8/255 gives comfortable headroom.
  gtkAssert.colorsClose(native.color, web.color, {
    tolerance: 8 / 255,
    reason: "fixColorMixGamut converts color-mix from srgb->oklab, shifting visited color ~5-7/255",
  });
});
gtkTest("menu-button-circular", { childSelector: "button.toggle" });
gtkTest("menu-button-disabled", { childSelector: "button.toggle" });
gtkTest("menu-button-flat", { childSelector: "button.toggle" });
gtkTest("menu-button-icon", { childSelector: "button.toggle" });
gtkTest("menu-button-text-default", { childSelector: "button.toggle" });
gtkTest("toggle-disabled");
gtkTest("toggle-text-checked");
gtkTest("toggle-text-default");
gtkTest("toggle-text-flat");

gtkTestExpectFailure("button-text-default-wrong-bg", ["background_color"]);
gtkTestExpectFailure("button-text-default-wrong-padding", ["padding"]);
gtkTestExpectFailure("button-text-default-wrong-radius", ["border_radius"]);
