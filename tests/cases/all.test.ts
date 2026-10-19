import { expect } from "vite-plus/test";
import {
  type Color,
  compare,
  gtkTest,
  gtkTestExpectFailure,
  type WidgetSnapshot,
} from "../harness";

/** The color as painted: channels outside sRGB are clipped. */
function painted(s: WidgetSnapshot): WidgetSnapshot {
  const clip = (c: Color | null) =>
    c && {
      ...c,
      r: Math.min(Math.max(c.r, 0), 1),
      g: Math.min(Math.max(c.g, 0), 1),
      b: Math.min(Math.max(c.b, 0), 1),
    };
  return { ...s, background_color: clip(s.background_color), color: clip(s.color) };
}

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
// The light destructive color, oklab(from $destructive_bg_color min(l, 0.5) a b), has a negative
// green. In color-mix(in srgb, currentColor 15%, transparent), GTK's apply_gamma() continues the
// sRGB curve below 0 linearly (-0.198), CSS mirrors it (-0.130). Both paint it as 0.
gtkTest("button-text-destructive", (native, web) => {
  expect(compare(painted(native), painted(web)).failures).toEqual([]);
});
gtkTest("button-text-flat");
gtkTest("button-text-opaque");
gtkTest("button-text-suggested");
gtkTest("link-default");
gtkTest("link-visited");
gtkTest("menu-button-circular", { childSelector: "button.toggle" });
gtkTest("menu-button-disabled", { childSelector: "button.toggle" });
gtkTest("menu-button-flat", { childSelector: "button.toggle" });
gtkTest("menu-button-icon", { childSelector: "button.toggle" });
gtkTest("menu-button-text-default", { childSelector: "button.toggle" });
gtkTest("toggle-disabled");
gtkTest("toggle-text-checked");
gtkTest("toggle-text-default");
gtkTest("toggle-text-flat");
gtkTest("toggle-text-osd-checked");

gtkTestExpectFailure("button-text-default-wrong-bg", ["background_color"]);
gtkTestExpectFailure("button-text-default-wrong-padding", ["padding"]);
gtkTestExpectFailure("button-text-default-wrong-radius", ["border_radius"]);
