import { gtkAssert } from "../assert";
import { findChild, gtkTest } from "../harness";

// A wrapped line takes rows of its own; the gutter is as tall as the text.
gtkTest("source-view-wrap", (native, web) => {
  gtkAssert.numbersEqual(native.height, web.height, "height");
  gtkAssert.numbersEqual(
    findChild(native, "gutter").height,
    findChild(web, "gutter").height,
    "gutter height",
  );
});
