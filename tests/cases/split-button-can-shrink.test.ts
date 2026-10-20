import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// Narrower than its label, the split button ellipsizes it on one line.
gtkTest("split-button-can-shrink", (native, web) => {
  gtkAssert.numbersEqual(native.width, web.width, "width");
  gtkAssert.numbersEqual(native.height, web.height, "height");
  const nativeLabel = findChild(native, "label");
  const webLabel = findChild(web, "label");
  gtkAssert.numbersEqual(nativeLabel.width, webLabel.width, "label width");
  gtkAssert.numbersEqual(nativeLabel.height, webLabel.height, "label height");
});
