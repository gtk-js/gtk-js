import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, gtkTest } from "../harness";

// The image has no icon size of its own, so it takes the 32px -gtk-icon-size
// of the .large-icons box around it (gtk_icon_helper_get_size()).
gtkTest("image-inherit-in-large-icons", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const [nativeImage] = native.children!;
  const [webImage] = web.children!;
  gtkAssert.numbersEqual(nativeImage!.width, webImage!.width, "image width");
  gtkAssert.numbersEqual(nativeImage!.height, webImage!.height, "image height");
});
