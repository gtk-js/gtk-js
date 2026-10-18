import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest, type WidgetSnapshot } from "../harness";

// Filtered on the banner root: font_weight, background_color, border_radius —
// host/inner-node bleed.
//
// font_weight: the banner root (adw-banner.c:495, css_name="banner") has no
// font-weight in SCSS. Bold comes from the inner .heading title label.
//
// background_color: per _toolbars.scss:238-240, background-color is on
// `banner > revealer > widget`, not the `banner` root. The outer node is
// transparent; native extraction captures the widget's background through it.
//
// border_radius: the banner is at the adw::Window's corner and captures the
// 9px CSD clip radius via GskRoundedClipNode (same artifact as
// actionbar-default).
//
// The widget node (filtered the same way, its background compared below) has
// the theme's padding and places the title and button like allocate_content()
// in adw-banner.c. At 200px the title and button don't fit side by
// side, so the title goes above the button, which is 160px wide
// (BUTTON_VERT_MIN_WIDTH); both are centered.
// The title can be 1px off: Pango rounds its width up to whole pixels.

// Native sizes are content boxes (gtk_widget_get_width()), web ones border boxes.
const outer = (n: WidgetSnapshot) => ({
  width: n.width + n.padding.left + n.padding.right + n.border_widths.left + n.border_widths.right,
  height:
    n.height + n.padding.top + n.padding.bottom + n.border_widths.top + n.border_widths.bottom,
});

gtkTest("banner-with-button", (native, web) => {
  const { failures } = compare(native, web);
  expect(
    failures.filter(
      (f) =>
        f.property !== "font_weight" &&
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
  gtkAssert.numbersEqual(native.width, web.width, "banner width");
  gtkAssert.numbersEqual(native.height, web.height, "banner height");

  const nativeWidget = findChild(native, "widget");
  const webWidget = findChild(web, "widget");
  expect(
    compare(nativeWidget, webWidget).failures.filter(
      (f) =>
        f.property !== "font_weight" &&
        f.property !== "background_color" &&
        !f.property.startsWith("border_radius"),
    ),
  ).toEqual([]);
  gtkAssert.colorsClose(
    nativeWidget.background_color,
    webWidget.background_color,
    { tolerance: 2 / 255, reason: "gtk-css mixes color-mix(in srgb) in oklab (color-mix scope)" },
    "widget background",
  );

  const nativeTitle = findChild(nativeWidget, "label");
  const webTitle = findChild(webWidget, "label");
  const rounding = { tolerance: 1, reason: "Pango rounds label widths up" };
  gtkAssert.numbersClose(nativeTitle.width, webTitle.width, rounding, "title width");
  gtkAssert.numbersClose(nativeTitle.x!, webTitle.x!, rounding, "title x");
  gtkAssert.numbersEqual(nativeTitle.y!, webTitle.y!, "title y");
  gtkAssert.numbersEqual(nativeTitle.height, webTitle.height, "title height");

  const nativeButton = findChild(nativeWidget, "button");
  const webButton = findChild(webWidget, "button");
  gtkAssert.numbersEqual(nativeButton.x!, webButton.x!, "button x");
  gtkAssert.numbersEqual(nativeButton.y!, webButton.y!, "button y");
  gtkAssert.numbersEqual(outer(nativeButton).width, webButton.width, "button width");
  gtkAssert.numbersEqual(outer(nativeButton).height, webButton.height, "button height");
});
