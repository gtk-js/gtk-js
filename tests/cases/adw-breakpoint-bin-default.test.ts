import { expect } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { compare, findChild, gtkTest } from "../harness";

// The bin allocates its child its whole size (allocate_child()). The native
// window makes the bin bigger than its size request, so compare what's left.
gtkTest("adw-breakpoint-bin-default", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);
  const nativeLabel = findChild(native, "label");
  const webLabel = findChild(web, "label");
  gtkAssert.numbersEqual(
    native.width - nativeLabel.width,
    web.width - webLabel.width,
    "width left",
  );
  gtkAssert.numbersEqual(
    native.height - nativeLabel.height,
    web.height - webLabel.height,
    "height left",
  );
});
