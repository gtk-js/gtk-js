import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// The image has no icon size of its own, so it takes the 32px -gtk-icon-size
// of the .large-icons box around it (gtk_icon_helper_get_size()).
gtkTest("image-inherit-in-large-icons", (native, web) => {
  // The native box has no background of its own, but the extractor can report
  // the icon's color as one (see the ColorNode note in extract.rs): with
  // older GTK versions, a symbolic icon draws a color node over the box.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
  const [nativeImage] = native.children!;
  const [webImage] = web.children!;
  gtkAssert.numbersEqual(nativeImage!.width, webImage!.width, "image width");
  gtkAssert.numbersEqual(nativeImage!.height, webImage!.height, "image height");
});
