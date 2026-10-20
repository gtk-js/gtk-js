import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("spinner-spinning-custom-size", (native, web) => {
  // Native uses -gtk-icon-source (no borders); web uses CSS border for the circle.
  // border_widths is an implementation detail — skip it.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => !f.property.startsWith("border_widths"))).toEqual([]);
});

// The icon is drawn at the spinner's size (gtk_spinner_snapshot()), the case's
// 24px, not at 16px. The spinner rotates, so the icon's box is at least that big.
gtkTest("spinner-spinning-custom-size", { childSelector: "svg" }, (_native, icon) => {
  expect(icon.width).toBeGreaterThanOrEqual(23.5);
  expect(icon.height).toBeGreaterThanOrEqual(23.5);
});
