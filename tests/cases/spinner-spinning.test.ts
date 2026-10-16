import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("spinner-spinning", (native, web) => {
  // Native uses -gtk-icon-source (no borders); web uses CSS border for the circle.
  // border_widths is an implementation detail — skip it.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("border_widths"))).toEqual([]);
});
