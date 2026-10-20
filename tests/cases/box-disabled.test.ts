import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

// gtk_widget_set_sensitive(FALSE) on the box makes its children insensitive
// too, so they match :disabled: the switch's slider loses its shadow
// (switch > slider:disabled).
gtkTest("box-disabled", (native, web) => {
  for (const name of ["label", "button", "switch"]) {
    const failures = compare(findChild(native, name), findChild(web, name)).failures;
    expect({ name, failures }).toEqual({ name, failures: [] });
  }
  const visible = (node: typeof native) => node.shadows.filter((s) => s.color.a > 0);
  expect(visible(findChild(web, "slider"))).toEqual(visible(findChild(native, "slider")));
});
