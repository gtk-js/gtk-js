import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// An insensitive link is drawn in the link color at the disabled opacity
// (button.link:disabled).
gtkTest("link-disabled", (native, web) => {
  // GTK reports .flat:disabled's filter: opacity(30%) as the widget's opacity;
  // the web snapshot reads the opacity property, not the filter.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "opacity")).toEqual([]);
});
