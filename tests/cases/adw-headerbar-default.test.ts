import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// AdwHeaderBar shares the same CSS node name "headerbar" as GtkHeaderBar.
// The native GSK extraction does not capture inset shadows for headerbar.
gtkTest("adw-headerbar-default", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("inset_shadows"))).toEqual([]);
});
