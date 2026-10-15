import { gtkAssert } from "../assert";
import { gtkTest, gtkTestExpectFailure } from "../harness";

import "./check-button-checked-disabled.test";
import "./check-button-checked.test";
import "./check-button-default.test";
import "./check-button-disabled.test";
import "./check-button-indeterminate.test";
import "./check-button-no-label.test";
import "./calendar-default.test";
import "./dropdown-default.test";
import "./editable-label-disabled.test";
import "./editable-label-display-default.test";
import "./editable-label-display-empty.test";
import "./editable-label-editing-active.test";
import "./image-default.test";
import "./image-large-icons.test";
import "./image-no-icon-name.test";
import "./image-normal-icons.test";
import "./image-pixel-size-24.test";
import "./label-default.test";
import "./label-disabled.test";
import "./label-ellipsize.test";
import "./label-justify-center.test";
import "./label-width-chars.test";
import "./label-wrap-char.test";
import "./label-wrap-word.test";
import "./label-xalign.test";
import "./listbox-default.test";
import "./listbox-separators.test";
import "./levelbar-continuous-default.test";
import "./levelbar-continuous-full.test";
import "./levelbar-continuous-low.test";
import "./levelbar-continuous-vertical.test";
import "./levelbar-disabled.test";
import "./levelbar-discrete-default.test";
import "./levelbar-discrete-inverted.test";
import "./notebook-default.test";
import "./popover-default.test";
import "./progressbar-fraction-small.test";
import "./progressbar-horizontal-0.test";
import "./progressbar-horizontal-100.test";
import "./progressbar-horizontal-50.test";
import "./progressbar-inverted-50.test";
import "./progressbar-osd-horizontal.test";
import "./progressbar-text-custom.test";
import "./progressbar-vertical-50.test";
import "./radio-button-checked.test";
import "./radio-button-default.test";
import "./scale-default.test";
import "./scrollbar-default.test";
import "./scrolled-window-default.test";
import "./scrolled-window-frame.test";
import "./stack-default.test";
import "./separator-horizontal-default.test";
import "./separator-spacer-horizontal.test";
import "./separator-vertical.test";
import "./spinner-default.test";
import "./spinner-disabled-not-spinning.test";
import "./spinner-disabled-spinning.test";
import "./spinner-spinning-custom-size.test";
import "./spinner-spinning.test";
import "./switch-off-default.test";
import "./switch-off-disabled.test";
import "./switch-on-default.test";
import "./switch-on-disabled.test";
import "./window-title-both-empty.test";
import "./window-title-long-text.test";
import "./window-title-no-subtitle.test";
import "./window-title-text-default.test";
import "./window-title-with-subtitle.test";

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
